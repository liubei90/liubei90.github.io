
// ConstantScoreQuery
// ConstantScore(DocValuesFieldExistsQuery [field=_primary_term])
// children: 
//    DocValuesFieldExistsQuery
//    DocValuesFieldExistsQuery [field=_primary_term]
POST /ecommerce/_search
{
  "profile": true,
  "size": 1
}

// 同上
POST /ecommerce/_search
{
  "query": {
    "match_all": {}
  }, 
  "profile": true,
  "size": 1
}

// BooleanQuery
// +category.keyword:Women's Shoes +category.keyword:Women's Clothing
// children:
//    TermQuery
//    category.keyword:Women's Shoes
//    TermQuery
//    category.keyword:Women's Clothing
POST /ecommerce/_search
{
  "query": {
    "bool": {
      "must": [
        {
          "term": {
            "category.keyword": {
              "value": "Women's Shoes"
            }
          }
        },
        {
          "term": {
            "category.keyword": {
              "value": "Women's Clothing"
            }
          }
        }
      ]
    }
  },
  "profile": true,
  "size": 1
}

// BooleanQuery
// +(category.keyword:Women's Shoes)^2.0 +(category.keyword:Women's Clothing)^0.2
// children:
//    BoostQuery
//    (category.keyword:Women's Shoes)^2.0
//    BoostQuery
//    (category.keyword:Women's Clothing)^0.2
POST /ecommerce/_search
{
  "query": {
    "bool": {
      "must": [
        {
          "term": {
            "category.keyword": {
              "value": "Women's Shoes",
              "boost": 2
            }
          }
        },
        {
          "term": {
            "category.keyword": {
              "value": "Women's Clothing",
              "boost": 0.2
            }
          }
        }
      ]
    }
  },
  "profile": true,
  "size": 1
}

// BooleanQuery
// category.keyword:Women's Shoes category.keyword:Women's Clothing
// children:
//    TermQuery
//    category.keyword:Women's Shoes
//    TermQuery
//    category.keyword:Women's Clothing
POST /ecommerce/_search
{
  "query": {
    "bool": {
      "should": [
        {
          "term": {
            "category.keyword": {
              "value": "Women's Shoes"
            }
          }
        },
        {
          "term": {
            "category.keyword": {
              "value": "Women's Clothing"
            }
          }
        }
      ]
    }
  },
  "profile": true,
  "size": 1
}

// BooleanQuery
// (category.keyword:Women's Shoes)^2.0 (category.keyword:Women's Clothing)^0.2
// children:
//    BoostQuery
//    (category.keyword:Women's Shoes)^2.0
//    BoostQuery
//    (category.keyword:Women's Clothing)^0.2
POST /ecommerce/_search
{
  "query": {
    "bool": {
      "should": [
        {
          "term": {
            "category.keyword": {
              "value": "Women's Shoes",
              "boost": 2
            }
          }
        },
        {
          "term": {
            "category.keyword": {
              "value": "Women's Clothing",
              "boost": 0.2
            }
          }
        }
      ]
    }
  },
  "profile": true,
  "size": 1
}

// bool效果和must一致
// BooleanQuery
// #category.keyword:Women's Shoes #category.keyword:Women's Clothing
// children:
//    TermQuery
//    category.keyword:Women's Shoes
//    TermQuery
//    category.keyword:Women's Clothing
POST /ecommerce/_search
{
  "query": {
    "bool": {
      "filter": [
        {
          "term": {
            "category.keyword": {
              "value": "Women's Shoes"
            }
          }
        },
        {
          "term": {
            "category.keyword": {
              "value": "Women's Clothing"
            }
          }
        }
      ]
    }
  },
  "profile": true,
  "size": 1
}

// BooleanQuery
// +(-category.keyword:Women's Shoes -category.keyword:Women's Clothing #*:*) #DocValuesFieldExistsQuery [field=_primary_term]
// children:
//    BooleanQuery
//    -category.keyword:Women's Shoes -category.keyword:Women's Clothing #*:*
//    children:
//        TermQuery
//        category.keyword:Women's Shoes
//        TermQuery
//        category.keyword:Women's Clothing
//        MatchAllDocsQuery
//        *:*
//        DocValuesFieldExistsQuery
//        DocValuesFieldExistsQuery [field=_primary_term]
POST /ecommerce/_search
{
  "query": {
    "bool": {
      "must_not": [
        {
          "term": {
            "category.keyword": {
              "value": "Women's Shoes"
            }
          }
        },
        {
          "term": {
            "category.keyword": {
              "value": "Women's Clothing"
            }
          }
        }
      ]
    }
  },
  "profile": true,
  "size": 1
}

// BooleanQuery
// +category.keyword:Women's Clothing -category.keyword:Women's Shoes category.keyword:Women's Shoes category.keyword:Man's Shoes category.keyword:Man's Clothing
// children:
//    TermQuery
//    category.keyword:Women's Clothing
//    TermQuery
//    category.keyword:Women's Shoes
//    TermQuery
//    category.keyword:Women's Shoes
//    TermQuery
//    category.keyword:Man's Shoes
//    TermQuery
//    category.keyword:Man's Clothing
//    
POST /ecommerce/_search
{
  "query": {
    "bool": {
      "must": [
        {
          "term": {
            "category.keyword": {
              "value": "Women's Clothing"
            }
          }
        }
      ],
      "must_not": [
        {
          "term": {
            "category.keyword": {
              "value": "Women's Shoes"
            }
          }
        }
      ],
      "should": [
        {
          "term": {
            "category.keyword": {
              "value": "Women's Shoes"
            }
          }
        },
        {
          "term": {
            "category.keyword": {
              "value": "Man's Shoes"
            }
          }
        },
        {
          "term": {
            "category.keyword": {
              "value": "Man's Clothing"
            }
          }
        }
      ]
    }
  },
  "profile": true,
  "size": 1
}

// 默认得分
// BoostQuery
// (ConstantScore(category.keyword:Women's Shoes))^1.2
// children:
//    TermQuery
//    category.keyword:Women's Shoes
POST /ecommerce/_search
{
  "query": {
    "constant_score": {
      "filter": {
        "term": {
          "category.keyword": {
            "value": "Women's Shoes"
          }
        }
      },
      "boost": 1.2
    }
  },
  "profile": true,
  "size": 1
}

// BooleanQuery
// +(category.keyword:Women's Shoes | category.keyword:Women's Clothing)~0.5 #DocValuesFieldExistsQuery [field=_primary_term]
// children:
//    DisjunctionMaxQuery
//    (category.keyword:Women's Shoes | category.keyword:Women's Clothing)~0.5
//    children:
//      TermQuery
//      category.keyword:Women's Shoes
//      TermQuery
//      category.keyword:Women's Clothing
//    DocValuesFieldExistsQuery
//    DocValuesFieldExistsQuery [field=_primary_term]
POST /ecommerce/_search
{
  "query": {
    "dis_max": {
      "queries": [
        {
          "term": {
            "category.keyword": {
              "value": "Women's Shoes"
            }
          }
        },
        {
          "term": {
            "category.keyword": {
              "value": "Women's Clothing"
            }
          }
        }
      ],
      "tie_breaker": 0.5
    }
  },
  "profile": true,
  "size": 1
}

// BooleanQuery
// +(function score (+category.keyword:Women's Shoes +category.keyword:Women's Clothing, functions: []))^5.0 #DocValuesFieldExistsQuery [field=_primary_term]
// children:
//    BoostQuery
//    (function score (+category.keyword:Women's Shoes +category.keyword:Women's Clothing, functions: []))^5.0
//    children:
//        TermQuery
//        category.keyword:Women's Shoes
//        TermQuery
//        category.keyword:Women's Clothing
//    DocValuesFieldExistsQuery
//    DocValuesFieldExistsQuery [field=_primary_term]
POST /ecommerce/_search
{
  "query": {
    "function_score": {
      "query": {
        "bool": {
          "must": [
            {
              "term": {
                "category.keyword": {
                  "value": "Women's Shoes"
                }
              }
            },
            {
              "term": {
                "category.keyword": {
                  "value": "Women's Clothing"
                }
              }
            }
          ]
        }
      },
      "boost": 5,
      "boost_mode": "avg"
    }
  },
  "profile": true,
  "size": 1
}






// BooleanQuery
// +FunctionScoreQuery(category.keyword:Women's Shoes, scored by boost(queryboost(score(category.keyword:Women's Clothing))^0.2)) #DocValuesFieldExistsQuery [field=_primary_term]
// children:
//    FunctionScoreQuery
//    FunctionScoreQuery(category.keyword:Women's Shoes, scored by boost(queryboost(score(category.keyword:Women's Clothing))^0.2))
//    DocValuesFieldExistsQuery
//    DocValuesFieldExistsQuery [field=_primary_term]
POST /ecommerce/_search
{
  "query": {
    "boosting": {
      "positive": {
        "term": {
          "category.keyword": {
            "value": "Women's Shoes"
          }
        }
      },
      "negative": {
        "term": {
          "category.keyword": {
            "value": "Women's Clothing"
          }
        }
      },
      "negative_boost": 0.2
    }
  }, 
  "profile": true,
  "size": 1
}


// BooleanQuery
// category:women's category:shoes
// children：
//    TermQuery
//    category:women's
//    TermQuery
//    category:shoes
POST /ecommerce/_search
{
  "query": {
    "match": {
      "category": "Women's Shoes"
    }
  }, 
  "profile": true,
  "size": 1
}

// BooleanQuery
// +category:women's +category:shoes
// children: 
//    TermQuery
//    category:women's
//    TermQuery
//    category:shoes
POST /ecommerce/_search
{
  "query": {
    "match": {
      "category": {
        "query": "Women's Shoes",
        "operator": "and"
      }
    }
  }, 
  "profile": true,
  "size": 1
}

// BooleanQuery
// (category:women's category:shoes)~2
// children:
//    TermQuery
//    category:women's
//    TermQuery
//    category:shoes
POST /ecommerce/_search
{
  "query": {
    "match": {
      "category": {
        "query": "Women's Shoes",
        "operator": "or",
        "minimum_should_match": 2
      }
    }
  }, 
  "profile": true,
  "size": 1
}

// BooleanQuery
// +(category:women's category:shoes*) #DocValuesFieldExistsQuery [field=_primary_term]
// children:
//    BooleanQuery
//    category:women's category:shoes*
//    children: 
//        TermQuery
//        category:women's
//        MultiTermQueryConstantScoreWrapper
//        category:shoes*
//    DocValuesFieldExistsQuery
//    DocValuesFieldExistsQuery [field=_primary_term]
// TermQuery
// category:shoes
POST /ecommerce/_search
{
  "query": {
    "match_bool_prefix": {
      "category": {
        "query": "Women's Shoes"
      }
    }
  }, 
  "profile": true,
  "size": 1
}

// BooleanQuery
// +category:"women's shoes" #DocValuesFieldExistsQuery [field=_primary_term]
// children:
//    PhraseQuery
//    category:"women's shoes"
//    DocValuesFieldExistsQuery
//    DocValuesFieldExistsQuery [field=_primary_term]
POST /ecommerce/_search
{
  "query": {
    "match_phrase": {
      "category": {
        "query": "Women's Shoes"
      }
    }
  }, 
  "profile": true,
  "size": 1
}

// BooleanQuery
// +((customer_first_name:women's customer_first_name:shoes) | (category:women's category:shoes)) #DocValuesFieldExistsQuery [field=_primary_term]
// children:
//    DisjunctionMaxQuery
//    ((customer_first_name:women's customer_first_name:shoes) | (category:women's category:shoes))
//    children:
//        BooleanQuery
//        customer_first_name:women's customer_first_name:shoes
//        children:
//            TermQuery
//            customer_first_name:women's
//            TermQuery
//            customer_first_name:shoes
//        BooleanQuery
//        category:women's category:shoes
//        children:
//            TermQuery
//            category:women's
//            TermQuery
//            category:shoes
//    DocValuesFieldExistsQuery
//    DocValuesFieldExistsQuery [field=_primary_term]
POST /ecommerce/_search
{
  "query": {
    "multi_match": {
      "query": "Women's Shoes",
      "fields": ["category", "customer_first_name"]
    }
  }, 
  "profile": true,
  "size": 1
}

// BooleanQuery
// category:women's category:shoes
POST /ecommerce/_search
{
  "query": {
    "query_string": {
      "query": "Women's Shoes",
      "default_field": "category"
    }
  }, 
  "profile": true,
  "size": 1
}


// BooleanQuery
// +category:women's +category:shoes
POST /ecommerce/_search
{
  "query": {
    "query_string": {
      "query": "Women's Shoes",
      "default_field": "category",
      "default_operator": "AND"
    }
  }, 
  "profile": true,
  "size": 1
}

// BooleanQuery
// +category:women's +category:shoes
POST /ecommerce/_search
{
  "query": {
    "query_string": {
      "query": "Women's AND Shoes",
      "default_field": "category"
    }
  }, 
  "profile": true,
  "size": 1
}

// BooleanQuery
// category:women's (+category:shoes +category:clothing)
POST /ecommerce/_search
{
  "query": {
    "query_string": {
      "query": "Women's OR (Shoes AND Clothing)",
      "default_field": "category"
    }
  }, 
  "profile": true,
  "size": 1
}

// BooleanQuery
// +ConstantScore(NormsFieldExistsQuery [field=category]) #DocValuesFieldExistsQuery [field=_primary_term]
// children:
//    ConstantScoreQuery
//    ConstantScore(NormsFieldExistsQuery [field=category])
//    children:
//        NormsFieldExistsQuery
//        NormsFieldExistsQuery [field=category]
//    DocValuesFieldExistsQuery
//    DocValuesFieldExistsQuery [field=_primary_term]
POST /ecommerce/_search
{
  "query": {
    "exists": {
      "field": "category"
    }
  }, 
  "profile": true,
  "size": 1
}

// BooleanQuery
// +MatchNoDocsQuery("empty BooleanQuery") #DocValuesFieldExistsQuery [field=_primary_term]
POST /ecommerce/_search
{
  "query": {
    "fuzzy": {
      "category.keyword": {
        "value": "wom"
      }
    }
  }, 
  "profile": true,
  "size": 1
}

// BooleanQuery
// +category:wom* #DocValuesFieldExistsQuery [field=_primary_term]
// children:
//    MultiTermQueryConstantScoreWrapper
//    category:wom*
//    DocValuesFieldExistsQuery
//    DocValuesFieldExistsQuery [field=_primary_term]
// TermQuery
// category:women's
POST /ecommerce/_search
{
  "query": {
    "prefix": {
      "category": {
        "value": "wom"
      }
    }
  }, 
  "profile": true,
  "size": 1
}

// IndexOrDocValuesQuery
// day_of_week_i:[2 TO 5]
POST /ecommerce/_search
{
  "query": {
    "range": {
      "day_of_week_i": {
        "gte": 2,
        "lte": 5
      }
    }
  }, 
  "profile": true,
  "size": 1
}

// BooleanQuery
// +category:/wom.*/ #DocValuesFieldExistsQuery [field=_primary_term]
// children:
//    MultiTermQueryConstantScoreWrapper
//    category:/wom.*/
//    DocValuesFieldExistsQuery
//    DocValuesFieldExistsQuery [field=_primary_term]
// TermQuery
// category:women's
POST /ecommerce/_search
{
  "query": {
    "regexp": {
      "category": {
        "value": "wom.*"
      }
    }
  }, 
  "profile": true,
  "size": 1
}

// TermQuery
// category.keyword:Women's Shoes
POST /ecommerce/_search
{
  "query": {
    "term": {
      "category.keyword": "Women's Shoes"
    }
  }, 
  "profile": true,
  "size": 1
}



// BoostQuery
// (category.keyword:Women's Shoes)^2.0
POST /ecommerce/_search
{
  "query": {
    "term": {
      "category.keyword": {
        "value": "Women's Shoes",
        "boost": 2
      }
    }
  }, 
  "profile": true,
  "size": 1
}



// ConstantScoreQuery
// ConstantScore(category.keyword:Women's Clothing category.keyword:Women's Shoes)
// children:
//    BooleanQuery
//    category.keyword:Women's Clothing category.keyword:Women's Shoes
//    children:
//        TermQuery
//        category.keyword:Women's Clothing
//        TermQuery
//        category.keyword:Women's Shoes
POST /ecommerce/_search
{
  "query": {
    "terms": {
      "category.keyword": ["Women's Shoes", "Women's Clothing"]
    }
  }, 
  "profile": true,
  "size": 1
}

// BoostQuery
// (ConstantScore(category.keyword:Women's Clothing category.keyword:Women's Shoes))^2.0
// children:
//    BooleanQuery
//    category.keyword:Women's Clothing category.keyword:Women's Shoes
//    children:
//        TermQuery
//        category.keyword:Women's Clothing
//        TermQuery
//        category.keyword:Women's Shoes
POST /ecommerce/_search
{
  "query": {
    "terms": {
      "category.keyword": ["Women's Shoes", "Women's Clothing"],
      "boost": 2
    }
  }, 
  "profile": true,
  "size": 1
}

// BooleanQuery
// +category.keyword:Women's* #DocValuesFieldExistsQuery [field=_primary_term]
// children:
//    MultiTermQueryConstantScoreWrapper
//    category.keyword:Women's*
//    DocValuesFieldExistsQuery
//    DocValuesFieldExistsQuery [field=_primary_term]
// BooleanQuery
// category.keyword:Women's Accessories category.keyword:Women's Clothing category.keyword:Women's Shoes
// children:
//    TermQuery
//    category.keyword:Women's Accessories
//    TermQuery
//    category.keyword:Women's Clothing
//    TermQuery
//    category.keyword:Women's Shoes
POST /ecommerce/_search
{
  "query": {
    "wildcard": {
      "category.keyword": {
        "value": "Women's*"
      }
    }
  }, 
  "profile": true,
  "size": 1
}


// ESToParentBlockJoinQuery
// ToParentBlockJoinQuery (products.category.keyword:Women's Clothing)
POST /ecommerce/_search
{
  "query": {
    "nested": {
      "path": "products",
      "query": {
        "term": {
          "products.category.keyword": {
            "value": "Women's Clothing"
          }
        }
      }
    }
  }, 
  "profile": true,
  "size": 1
}

// ESToParentBlockJoinQuery
// ToParentBlockJoinQuery (+products.category.keyword:Women's Clothing +products.category.keyword:Women's Shoes)
// children:
//    TermQuery
//    products.category.keyword:Women's Clothing
//    TermQuery
//    products.category.keyword:Women's Shoes
POST /ecommerce/_search
{
  "query": {
    "nested": {
      "path": "products",
      "query": {
        "bool": {
          "must": [
            {
              "term": {
                "products.category.keyword": {
                  "value": "Women's Clothing"
                }
              }
            },
            {
              "term": {
                "products.category.keyword": {
                  "value": "Women's Shoes"
                }
              }
            }
          ]
        }
      }
    }
  }, 
  "profile": true,
  "size": 1
}