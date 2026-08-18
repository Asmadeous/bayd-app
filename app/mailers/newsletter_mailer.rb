class NewsletterMailer < ApplicationMailer
  def new_post(blog_post, subscriber)
    @blog_post = blog_post
    @subscriber = subscriber
    # One-click unsubscribe hits the API directly (GET, no frontend page needed)
    # — default_url_options already points at this API's own public host.
    @unsubscribe_url = api_v1_newsletter_unsubscribe_url(token: subscriber.unsubscribe_token)
    @post_url = "#{ENV.fetch('BLOG_URL', 'https://baydspa.ca')}/blog/#{blog_post.slug}"

    mail(to: subscriber.email, subject: "New on the blog: #{blog_post.title}")
  end
end
