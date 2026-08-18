import type { StepType } from "@reactour/tour"

export const adminContentSteps: StepType[] = [
  {
    selector: '[data-tour="content-header"]',
    content:
      "Welcome to Content! This is a read-only overview of your blog posts — a quick way " +
      "to see what's been published without leaving this section.",
    position: "bottom",
  },
  {
    selector: '[data-tour="content-post-list"]',
    content:
      "Each row shows a post's title, author, and status (Published or Draft), plus its " +
      "publish date if it's live. To actually create or edit posts, head to the Blog " +
      "Posts page.",
    position: "top",
  },
  {
    selector: '[data-tour="content-pagination"]',
    content:
      "Use Prev/Next to page through older posts once there are more than fit on one page.",
    position: "top",
  },
]
