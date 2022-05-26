To start the flask server, run the following commands in the `mage-ai/mage_ai/server` directory:
```
flask run
```

If you get module import errors you may need to set your PYTHONPATH environment variables:
```
export PYTHONPATH="${PYTHONPATH}:/path/to/repo/mage-ai/mage_ai"
```

You may also need to set the FLASK_APP variable
```
export FLASK_APP=app
```