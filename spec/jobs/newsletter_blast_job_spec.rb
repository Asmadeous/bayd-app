require "rails_helper"

RSpec.describe NewsletterBlastJob do
  it "emails every subscribed subscriber, not unsubscribed ones" do
    post = create(:blog_post, status: "published")
    subscribed = create(:newsletter_subscriber, status: "subscribed")
    create(:newsletter_subscriber, status: "unsubscribed")

    expect { described_class.perform_now(post.id) }
      .to have_enqueued_mail(NewsletterMailer, :new_post).with(post, subscribed)
  end

  it "does nothing if the post is no longer published (e.g. unpublished before the job ran)" do
    post = create(:blog_post, status: "draft")
    create(:newsletter_subscriber, status: "subscribed")

    expect { described_class.perform_now(post.id) }
      .not_to have_enqueued_mail(NewsletterMailer, :new_post)
  end

  it "does nothing if the post was deleted before the job ran" do
    expect { described_class.perform_now(-1) }.not_to raise_error
  end
end
