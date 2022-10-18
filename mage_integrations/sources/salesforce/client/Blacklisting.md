# Blacklisted Objects Explanation

Some objects or fields may not be queryable for a variety of reasons, and these reasons are not always apparent. This document exists to provide some visibility to the research that prompted these fields and objects to be excluded from the tap's discovery or sync mode.

- [Overall](#overall)
- [Bulk API](#bulk-api)
- [Location in Code](#location-in-code)

* The Rest API has no unique restrictions

Each section has two parts.
1. A short explanation of what the category means.
2. Example(s) of messages returned by Salesforce when these situations are encountered.

## Overall

These restrictions apply to both the Bulk and REST API endpoints.

### Blacklisted Fields

#### attributes
This field is returned in JSON responses from Salesforce, but is not included in the `describe` endpoint's view of objects and their fields, so it will be removed from `RECORD`s before emitting.

### Query Restricted Objects

These are objects which the Salesforce API endpoint has reported a specific way of querying that requires a special `WHERE` clause, which may be incompatible for replication.

#### Types of Salesforce Errors associated with this category:

```
MALFORMED_QUERY: ________: a filter on a reified column is required [UserId,DurableId]
```

```
MALFORMED_QUERY: Implementation restriction: ________ requires a filter by a single Id, ChildRecordId or ParentContentFolderId using the equals operator
```

```
Implementation restriction: When querying the Vote object, you must filter using the following syntax: ParentId = [single ID], Parent.Type = [single Type], Id = [single ID], or Id IN [list of ID\'s].
```

```
EXTERNAL_OBJECT_UNSUPPORTED_EXCEPTION: Where clauses should contain ________
```

### Query Incompatible Objects

These are objects which the Salesforce API endpoint has reported issues with the `queryAll` method, or the concept of *query* in general.

#### Types of Salesforce Errors associated with this category:

```
INVALID_TYPE_FOR_OPERATION: entity type ________ does not support query
```

```
EXTERNAL_OBJECT_UNSUPPORTED_EXCEPTION: This query is not supported on the OutgoingEmail object. (OutgoingEmailRelation)
```

```
EXTERNAL_OBJECT_UNSUPPORTED_EXCEPTION: Getting all ________ is unsupported
```

### Datacloud Objects
Some objects associated with Data.com (e.g., DatacloudAddress, DatacloudContact, DatacloudPurchaseUsage) are returned from the Salesforce API's `describe` endpoint. These objects may throw errors on request, depending on the licensing and permissions of the account being used. Because of this, the tap will emit `SCHEMA` records for them, but they may not be queryable.

#### Types of Salesforce Errors associated with this category:
The error messages for this type, when failed, are not very descriptive.

```
An unexpected error occurred. Please include this ErrorId if you contact support: ##########-##### (##########)
```

## Bulk API

### Unsupported Fields

This refers to fields that are unsupported by the Bulk API for any reason, such as not being CSV serializable (which is required to process records in a streaming manner).

#### Types of Salesforce Errors associated with this category:

```
FeatureNotEnabled : Cannot serialize value for '________' in CSV format
```

### Unsupported Objects

These objects are explicitly not supported by the Salesforce Bulk API, as reported by the API itself.

#### Types of Salesforce Errors associated with this category:

```
Entity '________' is not supported by the Bulk API.
```

## Tags Referencing Custom Settings ##

During testing, it was discovered that `__Tag` objects associated with Custom Settings objects are reported as being not supported by the Bulk API. Because of this, affected `__Tag` objects will be removed from those found in discovery mode before emitting `SCHEMA` records.

In practice, this refers to `__Tag` objects that are described by Salesforce with an `Item` relationship field that has a `referenceTo` property for another object that is marked as `customSetting: true`.

#### Types of Salesforce Errors associated with this category:

```
Entity '01AA00000010AAA.Tag' is not supported by the Bulk API.
```
* When querying a `__Tag` field.

## Location in Code

### Discovery
The `do_discover()` method of `tap_salesforce/__init__.py` calls `get_blacklisted_objects` from `tap_salesforce/salesforce/__init__.py` to retrieve the list of unsupported objects for the current API endpoint and either skip or remove fields from discovered schemas according to the rules above as it iterates over the objects returned by Salesforce's `describe` endpoint.

### Sync
Since the `attributes` field is returned during sync mode, it will get filtered out during the transform step in the `do_sync()` method of `tap_salesforce/__init__.py` via the `pre_hook` passed to the `Transformer` object.

---

Copyright &copy; 2017 Stitch
