// GitHub projector: Rev settlement -> GitHub review comment. Dry-run unless GITHUB_TOKEN + REV_LIVE_POST=1.
// Truth stays in Rev; this is export only. Never posts without explicit live flag.
export async function postReview({ owner, repo, prNumber, body, event = "COMMENT", dryRun }) {
  const live = dryRun === false || (process.env.REV_LIVE_POST === "1" && process.env.GITHUB_TOKEN);
  if (!live) return { posted: false, dryRun: true, wouldPost: { owner, repo, prNumber, event, bytes: body.length } };
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
    },
    body: JSON.stringify({ body, event }),
  });
  if (!res.ok) return { posted: false, refusal: { reasonCode: "GITHUB_POST_FAILED", message: `HTTP ${res.status}`, retryable: res.status >= 500 } };
  const data = await res.json();
  return { posted: true, id: data.id, url: data.html_url };
}
