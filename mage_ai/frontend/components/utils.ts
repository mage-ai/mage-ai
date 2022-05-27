export const POSITIVE_QUALITY = ["Good", "Best"];
export const NEGATIVE_QUALITY = ["Bad", "Worse", "Worst"];

export const isBadQuality = (quality: string) => (
  NEGATIVE_QUALITY.includes(quality)
);

export const isGoodQuality = (quality: string) => !isBadQuality(quality);

export const pluralize = (word: string, num: number) => (
  num === 1 ? word : word + 's'
);

export const DATASET_PAYLOAD = {
  "id": "7",
  "metadata": {
    "name": "df2",
    "pipeline_id": 7,
    "column_types": {
      "col1": "number",
      "col2": "number"
    }
  },
  "pipeline": {
    "id": 7,
    "actions": []
  },
  "sample_data": {
    "col1": {
      "0": 1,
      "1": 2,
      "3": 4,
      "2": 3
    },
    "col2": {
      "0": 5,
      "1": 6,
      "3": 8,
      "2": 7
    }
  },
  "statistics": {
    "count": 100,
    "avg_null_value_count": 10,
    "avg_invalid_value_count": 10,
    "duplicate_row_count": 20,
    "completeness": 0.9,
    "validity": 0.8,
    "empty_column_count": 1,
    "col1/count": 4,
    "col1/count_distinct": 4,
    "col1/null_value_rate": 0.0,
    "col1/null_value_count": 0,
    "col1/average": 2.5,
    "col1/max": 4,
    "col1/median": 2.5,
    "col1/min": 1,
    "col1/sum": 10,
    "col1/invalid_value_count": 0,
    "col1/quality": "Good",
    "col2/count": 4,
    "col2/count_distinct": 4,
    "col2/null_value_rate": 0.0,
    "col2/null_value_count": 0,
    "col2/average": 6.5,
    "col2/max": 8,
    "col2/median": 6.5,
    "col2/min": 5,
    "col2/sum": 26,
    "col2/invalid_value_count": 0,
    "col2/quality": "Bad",
  },
  "insights": [
    [
      {
        "feature": {
          "uuid": "col1",
          "column_type": "number"
        },
        "charts": [
          {
            "type": "histogram",
            "x": [
              {
                "max": 2,
                "min": 1
              },
              {
                "max": 3,
                "min": 2
              },
              {
                "max": 4,
                "min": 3
              },
              {
                "max": 5,
                "min": 4
              }
            ],
            "x_metadata": {
              "label_type": "range"
            },
            "y": [
              {
                "value": 1
              },
              {
                "value": 1
              },
              {
                "value": 1
              },
              {
                "value": 1
              }
            ]
          }
        ],
        "correlations": [
          {
            "type": "bar_horizontal",
            "x": [
              {
                "label": "col2"
              }
            ],
            "y": [
              {
                "value": 1.0
              }
            ]
          }
        ],
        "time_series": []
      },
      {
        "feature": {
          "uuid": "col2",
          "column_type": "number"
        },
        "charts": [
          {
            "type": "histogram",
            "x": [
              {
                "max": 6,
                "min": 5
              },
              {
                "max": 7,
                "min": 6
              },
              {
                "max": 8,
                "min": 7
              },
              {
                "max": 9,
                "min": 8
              }
            ],
            "x_metadata": {
              "label_type": "range"
            },
            "y": [
              {
                "value": 1
              },
              {
                "value": 1
              },
              {
                "value": 1
              },
              {
                "value": 1
              }
            ]
          }
        ],
        "correlations": [
          {
            "type": "bar_horizontal",
            "x": [
              {
                "label": "col1"
              }
            ],
            "y": [
              {
                "value": 1.0
              }
            ]
          }
        ],
        "time_series": []
      }
    ],
    {
      "time_series": [],
      "correlations": [
        {
          "feature": {
            "uuid": "col1",
            "column_type": "number"
          },
          "correlations": [
            {
              "type": "bar_horizontal",
              "x": [
                {
                  "label": "col2"
                }
              ],
              "y": [
                {
                  "value": 1.0
                }
              ]
            }
          ]
        },
        {
          "feature": {
            "uuid": "col2",
            "column_type": "number"
          },
          "correlations": [
            {
              "type": "bar_horizontal",
              "x": [
                {
                  "label": "col1"
                }
              ],
              "y": [
                {
                  "value": 1.0
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "suggestions": [
    {
      "title": "Clean dirty column names",
      "message": "The following columns have unclean naming conventions: ['Name', 'requestType', 'resourceTypes', 'otherResource', 'createdDate', 'createdTime', 'timeStart', 'timeEnd', 'setupDuration(minutes)', 'teardownDuration', 'onBehalfOf', 'everyXDays', 'everyXWeeks', 'everyXMonths', 'everyXYears', 'afterXTimes', 'onDate', 'makePrivate', 'assignedDate', 'assignedTime', 'assignedUsers', 'roomContactName', 'eventDetails', 'scheduleId', 'scheduleTitle', 'placeholderField3', 'placeholderField4', 'placeholderField5', 'placeholderField6', 'placeholderField7', 'placeholderField8', 'placeholderField9', 'placeholderField10', 'placeholderField11', 'placeholderField12', 'placeholderField13', 'placeholderField14']. Making these names lowercase and alphanumeric may improveease of dataset access and reduce security risks.",
      "status": "not_applied",
      "action_payload": {
        "action_type": "clean_column_name",
        "action_arguments": [
          "Name",
          "requestType",
          "resourceTypes",
          "otherResource",
          "createdDate",
          "createdTime",
          "timeStart",
          "timeEnd",
          "setupDuration(minutes)",
          "teardownDuration",
          "onBehalfOf",
          "everyXDays",
          "everyXWeeks",
          "everyXMonths",
          "everyXYears",
          "afterXTimes",
          "onDate",
          "makePrivate",
          "assignedDate",
          "assignedTime",
          "assignedUsers",
          "roomContactName",
          "eventDetails",
          "scheduleId",
          "scheduleTitle",
          "placeholderField3",
          "placeholderField4",
          "placeholderField5",
          "placeholderField6",
          "placeholderField7",
          "placeholderField8",
          "placeholderField9",
          "placeholderField10",
          "placeholderField11",
          "placeholderField12",
          "placeholderField13",
          "placeholderField14"
        ],
        "action_code": "",
        "action_options": {

        },
        "action_variables": {

        },
        "axis": "column",
        "outputs": [

        ]
      }
    },
    {
      "title": "Remove columns with no values",
      "message": "The following columns have no values: ['resourceTypes', 'otherResource', 'createdDate', 'createdTime', 'mode', 'everyXYears', 'afterXTimes', 'onDate', 'dates', 'makePrivate', 'assignedDate', 'assignedTime', 'assignedUsers', 'roomContactName', 'zone', 'placeholderField3', 'placeholderField4', 'placeholderField5', 'placeholderField6', 'placeholderField7', 'placeholderField8', 'placeholderField9', 'placeholderField10', 'placeholderField11', 'placeholderField12', 'placeholderField13', 'placeholderField14']. Removing them may increase your data quality.",
      "status": "not_applied",
      "action_payload": {
        "action_type": "remove",
        "action_arguments": [
          "resourceTypes",
          "otherResource",
          "createdDate",
          "createdTime",
          "mode",
          "everyXYears",
          "afterXTimes",
          "onDate",
          "dates",
          "makePrivate",
          "assignedDate",
          "assignedTime",
          "assignedUsers",
          "roomContactName",
          "zone",
          "placeholderField3",
          "placeholderField4",
          "placeholderField5",
          "placeholderField6",
          "placeholderField7",
          "placeholderField8",
          "placeholderField9",
          "placeholderField10",
          "placeholderField11",
          "placeholderField12",
          "placeholderField13",
          "placeholderField14"
        ],
        "action_code": "",
        "action_options": {

        },
        "action_variables": {

        },
        "axis": "column",
        "outputs": [

        ]
      }
    },
    {
      "title": "Remove columns with high empty rate",
      "message": "The following columns have high empty rate: ['everyXDays', 'sun', 'mon']. Removing them may increase your data quality.",
      "status": "not_applied",
      "action_payload": {
        "action_type": "remove",
        "action_arguments": [
          "everyXDays",
          "sun",
          "mon"
        ],
        "action_code": "",
        "action_options": {

        },
        "action_variables": {

        },
        "axis": "column",
        "outputs": [

        ]
      }
    },
    {
      "title": "Remove columns with single value",
      "message": "The following columns have single value in all rows: ['requestType', 'repeat', 'onBehalfOf']. Suggest to remove them.",
      "status": "not_applied",
      "action_payload": {
        "action_type": "remove",
        "action_arguments": [
          "requestType",
          "repeat",
          "onBehalfOf"
        ],
        "action_code": "",
        "action_options": {

        },
        "action_variables": {

        },
        "axis": "column",
        "outputs": [

        ]
      }
    }
  ]
};