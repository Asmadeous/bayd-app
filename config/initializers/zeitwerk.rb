# Map the `simplybook/` autoload directory to the `SimplyBook` namespace.
# Without this, Zeitwerk camelizes the folder to `Simplybook` and fails to find
# the `SimplyBook::Client` / `SimplyBook::WebhookProcessor` constants on eager load.
Rails.autoloaders.main.inflector.inflect("simplybook" => "SimplyBook")
