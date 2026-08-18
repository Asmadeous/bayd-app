# Emails every subscribed newsletter address when a blog post is published.
# One deliver_later per subscriber, so a slow/failed send never blocks the rest.
class NewsletterBlastJob < ApplicationJob
  queue_as :low

  def perform(blog_post_id)
    blog_post = BlogPost.find_by(id: blog_post_id)
    return unless blog_post&.published?

    NewsletterSubscriber.subscribed.find_each do |subscriber|
      NewsletterMailer.new_post(blog_post, subscriber).deliver_later
    end
  end
end
