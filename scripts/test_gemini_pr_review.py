import unittest

from gemini_pr_review import render_comment


class GeminiReviewContractTests(unittest.TestCase):
    def test_truncated_diff_cannot_pass(self):
        # The HTTP layer is deliberately not called; test the deterministic guard
        # by mocking the response contract parser at the request boundary.
        import gemini_pr_review as review

        original = review._request_json
        review._request_json = lambda *args, **kwargs: {
            "candidates": [{
                "content": {"parts": [{
                    "text": '{"verdict":"PASS","summary":"Looks good","coverage":"complete","findings":[]}'
                }]}
            }]
        }
        try:
            result = review.review_diff(
                api_key="not-a-real-key",
                title="title",
                body="body",
                head_sha="a" * 40,
                files=[{"filename": "server/example.ts"}],
                diff="FILE: server/example.ts\n+const x = 1;",
                truncated=True,
            )
        finally:
            review._request_json = original
        self.assertEqual(result["verdict"], "BLOCKED")
        self.assertEqual(result["coverage"], "partial")

    def test_findings_must_reference_a_changed_file(self):
        import gemini_pr_review as review

        original = review._request_json
        review._request_json = lambda *args, **kwargs: {
            "candidates": [{
                "content": {"parts": [{
                    "text": '{"verdict":"PASS","summary":"Looks good","coverage":"complete","findings":['
                    '{"severity":"high","file":"secret.txt","line":1,"title":"Leak",'
                    '"evidence":"Not in the diff","recommendation":"Fix it"}]}'
                }]}
            }]
        }
        try:
            result = review.review_diff(
                api_key="not-a-real-key",
                title="title",
                body="body",
                head_sha="b" * 40,
                files=[{"filename": "server/example.ts"}],
                diff="FILE: server/example.ts\n+const x = 1;",
                truncated=False,
            )
        finally:
            review._request_json = original
        self.assertEqual(result["verdict"], "BLOCKED")
        self.assertEqual(result["coverage"], "partial")
        self.assertEqual(result["findings"], [])

    def test_valid_high_severity_finding_cannot_pass(self):
        import gemini_pr_review as review

        original = review._request_json
        review._request_json = lambda *args, **kwargs: {
            "candidates": [{
                "content": {"parts": [{
                    "text": '{"verdict":"PASS","summary":"Looks good","coverage":"complete","findings":['
                    '{"severity":"high","file":"server/example.ts","line":3,"title":"Missing auth",'
                    '"evidence":"Handler is unprotected","recommendation":"Require a principal"}]}'
                }]}
            }]
        }
        try:
            result = review.review_diff(
                api_key="not-a-real-key",
                title="title",
                body="body",
                head_sha="c" * 40,
                files=[{"filename": "server/example.ts"}],
                diff="FILE: server/example.ts\n+app.get('/admin', handler);",
                truncated=False,
            )
        finally:
            review._request_json = original
        self.assertEqual(result["verdict"], "NEEDS_CHANGES")
        self.assertEqual(result["coverage"], "complete")
        self.assertEqual(len(result["findings"]), 1)

    def test_comment_escapes_model_html_and_mentions(self):
        comment = render_comment({
            "verdict": "NEEDS_CHANGES",
            "coverage": "complete",
            "summary": "<script>alert(1)</script> @owner",
            "findings": [{
                "severity": "high",
                "file": "server/example.ts",
                "line": 7,
                "title": "<img src=x>",
                "evidence": "Missing guard @here",
                "recommendation": "Add a check",
            }],
        }, "d" * 40)
        self.assertNotIn("<script>", comment)
        self.assertNotIn("<img", comment)
        self.assertIn("&lt;script&gt;", comment)
        self.assertIn("@&#8203;owner", comment)
        self.assertIn("server/example.ts:7", comment)

    def test_complete_clean_review_can_pass(self):
        import gemini_pr_review as review

        original = review._request_json
        review._request_json = lambda *args, **kwargs: {
            "candidates": [{
                "content": {"parts": [{
                    "text": '{"verdict":"PASS","summary":"No actionable findings in the supplied diff.",'
                    '"coverage":"complete","findings":[]}'
                }]}
            }]
        }
        try:
            result = review.review_diff(
                api_key="not-a-real-key",
                title="title",
                body="body",
                head_sha="e" * 40,
                files=[{"filename": "server/example.ts"}],
                diff="FILE: server/example.ts\n+const x = 1;",
                truncated=False,
            )
        finally:
            review._request_json = original
        self.assertEqual(result["verdict"], "PASS")
        self.assertEqual(result["coverage"], "complete")

    def test_gemini_api_key_is_sent_in_header_not_url(self):
        import gemini_pr_review as review
        from unittest.mock import patch

        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self):
                return b'{}'

        secret = "test-key-never-in-url"
        with patch.object(review.urllib.request, "urlopen", return_value=FakeResponse()) as mocked:
            review._request_json(
                review.GEMINI_API,
                api_key=secret,
                method="POST",
                payload={"test": True},
            )
        request = mocked.call_args.args[0]
        self.assertNotIn(secret, request.full_url)
        self.assertEqual(request.get_header("X-goog-api-key"), secret)

    def test_pr_target_branch_is_validated(self):
        import gemini_pr_review as review
        from unittest.mock import patch

        good_pr = {
            "state": "open",
            "base": {"ref": "main"},
            "head": {"sha": "f" * 40},
        }
        with patch.object(review, "_request_json", return_value=good_pr):
            self.assertEqual(review.fetch_pr("org/repo", 1, "token")["head"]["sha"], "f" * 40)
        with patch.object(review, "_request_json", return_value={
            "state": "open", "base": {"ref": "release"}, "head": {"sha": "f" * 40}
        }):
            with self.assertRaises(review.ReviewError):
                review.fetch_pr("org/repo", 1, "token")

    def test_missing_file_patch_marks_coverage_partial(self):
        import gemini_pr_review as review
        from unittest.mock import patch

        with patch.object(review, "_request_json", side_effect=[
            [{"filename": "assets/image.png", "patch": None}],
            [],
        ]):
            files, diff, truncated = review.fetch_files_and_diff("org/repo", 1, "token")
        self.assertEqual(files[0]["filename"], "assets/image.png")
        self.assertIn("Patch unavailable", diff)
        self.assertTrue(truncated)

    def test_existing_review_comment_is_updated_not_duplicated(self):
        import gemini_pr_review as review
        from unittest.mock import patch

        calls = []
        def fake_request(url, **kwargs):
            calls.append((url, kwargs))
            if kwargs.get("method", "GET") == "GET":
                return [{"id": 123, "body": review.COMMENT_MARKER + "\nold report", "user": {"login": "github-actions[bot]"}}]
            return {"id": 123, "body": kwargs["payload"]["body"]}

        with patch.object(review, "_request_json", side_effect=fake_request):
            review.post_comment("org/repo", 5, "token", review.COMMENT_MARKER + "\nnew report")
        self.assertEqual(len(calls), 2)
        self.assertEqual(calls[1][1]["method"], "PATCH")
        self.assertIn("/issues/comments/123", calls[1][0])

if __name__ == "__main__":
    unittest.main()
