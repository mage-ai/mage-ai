To start the flask server, run the following commands in the `mage-ai/mage_ai/server` directory:
```
flask run -p 5789
```

By default, it may use the productive Flask environment which will not automatically update as you make changes to the server. You can use the development environment by setti g the `FLASK_ENV` variable.
```
export FLASK_ENV=development
```

If you get module import errors you may need to set your PYTHONPATH environment variables:
```
export PYTHONPATH="${PYTHONPATH}:/path/to/repo/mage-ai/mage_ai"
```

You may also need to set the FLASK_APP variable
```
export FLASK_APP=app
```
