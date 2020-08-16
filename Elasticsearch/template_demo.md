# 使用terms查询， 相同字段使用or， 不同字段使用and

```json

// params
{
  "category.keyword": ["Women's Shoes", "Women's Clothing"]
}

// template
{
  "query": {
    "bool": {
      "must": [
        {{#category.keyword}}
        {
          "terms": {
            "category.keyword": {{#toJson}}category.keyword{{/toJson}}
          }
        },
        {{/category.keyword}}
        { "match_all": {} }
      ]
    }
  }
}


// 等价查询语句
{
    "query" : {
      "bool" : {
        "must" : [
          {
            "terms" : {
              "category.keyword" : [
                "Women's Shoes",
                "Women's Clothing"
              ]
            }
          },
          {
            "terms" : {
              "category.keyword" : [
                "Women's Shoes",
                "Women's Clothing"
              ]
            }
          },
          {
            "match_all" : { }
          }
        ]
      }
    }
  }
```


# 使用term查询

**NOTE：**
- 当传入空数组时，查询条件相当于1<>1, 查询不到数据

```json
// params
{
  "category.keyword": ["Women's Shoes", "Women's Clothing"]
}

// template
{
  "query":{
    "bool":{
      "must": [
        {
          "bool": {
            "should": [
              {{#category.keyword}}
                { "term": { "category.keyword": "{{.}}" } },
              {{/category.keyword}}
              { "term": { "category.keyword": "" } }
            ]
          }
        }
      ]
    }
  }
}

// 等价查询语句
{
    "query" : {
      "bool" : {
        "must" : [
          {
            "bool" : {
              "should" : [
                {
                  "term" : {
                    "category.keyword" : "Women's Shoes"
                  }
                },
                {
                  "term" : {
                    "category.keyword" : "Women's Clothing"
                  }
                },
                {
                  "term" : {
                    "category.keyword" : ""
                  }
                }
              ]
            }
          }
        ]
      }
    }
  }

```




