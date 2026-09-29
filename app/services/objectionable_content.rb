# Masks objectionable words in user-posted text. Apple guideline 1.2 asks for a
# filter on user-generated content alongside report and block. Whole words only,
# so a listed word inside a longer one (a place name, a mushroom) is untouched.
module ObjectionableContent
  WORDS = YAML.load_file(Rails.root.join("config/objectionable_words.yml")).freeze
  PATTERN = /\b(?:#{Regexp.union(WORDS).source})\b/i

  module_function

  def mask(text)
    return text if text.blank?

    text.gsub(PATTERN) { |word| "*" * word.length }
  end
end
