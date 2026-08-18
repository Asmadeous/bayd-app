import type { StepType } from "@reactour/tour"

export const adminBlogSteps: StepType[] = [
  {
    selector: '[data-tour="blog-header"]',
    content:
      "Welcome to Blog Posts! This is where you write, edit, and publish articles that " +
      "appear on the public BAYD blog. Use the 'New Post' button to start a fresh article.",
    position: "bottom",
  },
  {
    selector: '[data-tour="blog-status-filter"]',
    content:
      "Filter the post list by status: All, Draft, or Published. Drafts are only visible " +
      "to admins — Published posts are live on the public site.",
    position: "bottom",
  },
  {
    selector: '[data-tour="blog-editor"]',
    content:
      "The Post Editor opens here when you click 'New Post' or 'Edit'. Upload a cover " +
      "image by dragging one onto the image box or clicking to browse, then fill in the " +
      "Title, Excerpt, and Body. Click 'Create Draft' or 'Save Changes' when you're done.",
    position: "bottom",
  },
  {
    selector: '[data-tour="blog-post-list"]',
    content:
      "Every blog post lives here as a card showing its title, author, status, and " +
      "publish date. Use 'Edit' to make changes, 'Publish' or 'Unpublish' to control " +
      "visibility, and 'Delete' to permanently remove a post.",
    position: "top",
  },
  {
    selector: '[data-tour="blog-pagination"]',
    content:
      "If you have more posts than fit on one page, use these Prev/Next controls to " +
      "browse through the full archive.",
    position: "top",
  },
]
