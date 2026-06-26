# Print API Summary

Read all controller files in `src/` and print a concise table of every registered route.

Format:
```
METHOD   PATH                              Controller method
------   ----                              -----------------
GET      /hospitals                        findAll
GET      /hospitals/:id                    findOne
POST     /hospitals                        create
...
```

Group by controller. After the table, list any route ordering issues (static segments appearing after `/:id` in the same controller).
