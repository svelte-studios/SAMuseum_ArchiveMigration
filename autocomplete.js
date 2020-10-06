module.exports = {
  analysis: {
    analyzer: {
      autocomplete: {
        tokenizer: "autocomplete",
        filter: ["lowercase"]
      },
      autocomplete_search: {
        tokenizer: "lowercase"
      }
    },
    tokenizer: {
      autocomplete: {
        type: "edge_ngram",
        min_gram: 2,
        max_gram: 12,
        token_chars: ["letter"]
      }
    }
  }
};
