# Database

This repository includes a simple golden reference of the schema used for the core database, as well as seed data.
A fixed version of the sqlite database has also been committed for any benefits.

## Create a new database 

While the committed `services.db` file is an empty version of the database used to run this project, you can create one of your own.

```
sqlite3
>> open .services.db
>> Paste the base schema SQL
```

> This requires sqlite3 to be installed in your system.
