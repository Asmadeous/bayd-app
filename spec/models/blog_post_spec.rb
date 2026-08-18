require "rails_helper"

RSpec.describe BlogPost do
  describe "newsletter blast on publish" do
    it "enqueues NewsletterBlastJob when a draft transitions to published" do
      post = create(:blog_post, status: "draft")

      expect { post.update!(status: "published") }
        .to have_enqueued_job(NewsletterBlastJob).with(post.id)
    end

    it "does not enqueue again when an already-published post is merely edited" do
      post = create(:blog_post, status: "published")

      expect { post.update!(title: "Updated title") }
        .not_to have_enqueued_job(NewsletterBlastJob)
    end

    it "does not enqueue when a post is created directly as draft" do
      expect { create(:blog_post, status: "draft") }
        .not_to have_enqueued_job(NewsletterBlastJob)
    end

    it "enqueues when a post is created directly as published" do
      expect { create(:blog_post, status: "published") }
        .to have_enqueued_job(NewsletterBlastJob)
    end
  end
end
