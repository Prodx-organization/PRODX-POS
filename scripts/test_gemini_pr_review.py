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


if __name__ == "__main__":
    unittest.main()
