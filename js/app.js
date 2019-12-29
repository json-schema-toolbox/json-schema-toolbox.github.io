var jsonEditor = CodeMirror.fromTextArea(
  document.getElementById("myTextarea"),
  {
    lineNumbers: true,
    mode: "application/json",
    gutters: ["CodeMirror-lint-markers"],
    lint: true,
    lintOnChange: true,
  }
);

var yamlEditor = CodeMirror.fromTextArea(
  document.getElementById("myTextarea2"),
  {
    lineNumbers: true,
    mode: "yaml",
    readOnly: true,
  }
);

var jsonEditor2 = CodeMirror.fromTextArea(
  document.getElementById("myTextarea3"),
  {
    lineNumbers: true,
    mode: "application/json",
    readOnly: true,
  }
);

var showExample = false;
var includeRequiredArray = false;
var includeRequiredBoolean = false;
var shouldAddNullType = false;

function processJSON() {
  showExample = document.getElementById("exampleCB").checked;
  includeRequiredArray = document.getElementById("includeRequiredArray")
    .checked;
  includeRequiredBoolean = document.getElementById("includeRequiredBoolean")
    .checked;
  shouldAddNullType = document.getElementById("shouldAddNullType").checked;

  var jsonString = jsonEditor.getValue().trim();

  if (this.tryParseJSON(jsonString) === true) {
    var json = JSON.parse(jsonString);

    var yamlReady = buildJSONSchema(
      json,
      includeRequiredArray,
      includeRequiredBoolean,
      shouldAddNullType
    );

    jsonEditor2.setValue(JSON.stringify(yamlReady, null, 2));

    var x = stringify(yamlReady);

    yamlEditor.setValue(x);

    tinyToast.show("✔ Conversion complete");

    var toastTimoutId = setTimeout(function() {
      tinyToast.hide();

      clearTimeout(toastTimoutId);
    }, 1500);
  } else {
    tinyToast.show("Invalid JSON. Have properties names in quotes");
  }
}

function tryParseJSON(jsonString) {
  try {
    var o = JSON.parse(jsonString);

    if (o && typeof o === "object") {
      return true;
    }
  } catch (e) {
    console.error(e, jsonString);

    return false;
  }

  return false;
}

function handleArrayData(data, previousOp) {
  if (!(data instanceof Array)) {
    return handleArrayData([data]);
  }

  var typeData = typeOf(data[0]);
  var opProp;

  var notSameTypeArray = [];

  if (data.length > 1) {
    notSameTypeArray = data
      .filter(function(p) {
        return typeOf(p) != typeData;
      })
      .concat(data[0])
      .map(function(p) {
        return typeOf(p);
      })
      .filter(function(value, index, self) {
        return self.indexOf(value) === index;
      });

    // console.log("notSameTypeArray", notSameTypeArray);
  }

  // var arrayInData = data.filter(function(p) {
  //   return typeOf(p) == "array";
  // })[0];

  // if (arrayInData) {
  //   if (!previousOp || !previousOp.items) {
  //     previousOp = {
  //       type: "array",
  //       items: {},
  //     };
  //   }

  //   previousOp = buildJSONSchema(
  //     arrayInData,
  //     includeRequiredArray,
  //     includeRequiredBoolean,
  //     shouldAddNullType,
  //     notSameTypeArray
  //   );

  //   console.log("previousOp", previousOp);

  //   return handleArrayData(arrayInData, previousOp);
  // }

  if (typeData == "undefined") {
    typeData = false;
  }

  if (typeData === "object") {
    opProp = {
      type: "array",
      items: {
        type:
          notSameTypeArray && notSameTypeArray.length > 1
            ? notSameTypeArray
            : typeData,
        properties: buildJSONSchema(
          data[0],
          includeRequiredArray,
          includeRequiredBoolean,
          shouldAddNullType,
          notSameTypeArray
        ).properties,
      },
    };

    return {
      opProp: opProp,
      typeData: typeData,
    };
  }

  opProp = {
    type: "array",
    items: typeData
      ? {
          type:
            notSameTypeArray && notSameTypeArray.length > 1
              ? notSameTypeArray
              : typeData,
        }
      : undefined,
  };

  return {
    opProp: opProp,
    typeData:
      notSameTypeArray && notSameTypeArray.length > 1
        ? notSameTypeArray
        : typeData,
    tempData: data[0],
  };
}

function buildJSONSchema(
  data,
  includeRequiredArray,
  includeRequiredBoolean,
  shouldAddNullType,
  typeArray
) {
  var keys = Object.keys(data);

  var op = {
    properties: {},
  };

  if (includeRequiredArray) {
    op.required = keys;
  }

  keys.forEach(function(x) {
    var value = data[x];
    var typeData = typeArray || typeOf(value);

    if (["array", "object", "null"].indexOf(typeData) === -1) {
      op.properties[x] = {
        type: typeData,
      };

      if (includeRequiredBoolean) op.properties[x].required = true;

      if (showExample === true) op.properties[x].example = value;
    } else {
      switch (typeData) {
        //#region switchCaseArray
        case "array":
          var opProps = [];
          var result;
          var tempData = data[x];

          while (typeData == "array" || typeData instanceof Array) {
            result = handleArrayData(tempData);

            if (result instanceof Array) {
              console.log("result", result[0]);

              for (var singleResult of result[0]) {
                opProps.push(singleResult.opProp);
              }

              break;
            } else {
              opProps.push(result.opProp);

              typeData = result.typeData;

              tempData = result.tempData;
            }
          }

          console.log("onProps", opProps);

          var opPropsLength = opProps.length;

          var objectWithNestedProps = {
            items: {},
          };

          for (var i = 0; i < opPropsLength; i++) {
            if (i == 0) {
              op.properties[x] = opProps[0];

              objectWithNestedProps = objectWithNestedProps.items = opProps[0];
            } else {
              objectWithNestedProps = objectWithNestedProps.items = opProps[i];

              if (i == opPropsLength - 1) {
                if (
                  showExample === true &&
                  (objectWithNestedProps.items.type == "string" ||
                    objectWithNestedProps.items.type == "number" ||
                    objectWithNestedProps.items.type == "boolean")
                ) {
                  objectWithNestedProps.items.example = value[0];
                }

                if (
                  includeRequiredBoolean &&
                  (objectWithNestedProps.items.type == "string" ||
                    objectWithNestedProps.items.type == "number" ||
                    objectWithNestedProps.items.type == "boolean")
                ) {
                  objectWithNestedProps.items.required = true;
                }
              }
            }

            value = value[0];
          }

          break;
        //#endregion switchCaseArray
        case "object":
          op.properties[x] = buildJSONSchema(
            data[x],
            includeRequiredArray,
            includeRequiredBoolean,
            shouldAddNullType,
            typeArray
          );

          op.properties[x].type = typeArray || "object";

          break;
        case "null":
          // Should follow: https://json-schema.org/understanding-json-schema/reference/null.html#null
          // Open API 3 is different here: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#dataTypes

          op.properties[x] = {};

          op.properties[x].nullable = true;

          if (shouldAddNullType) {
            op.properties[x].type = typeArray || "null";
          }

          if (includeRequiredBoolean) op.properties[x].required = true;

          break;
        default:
          console.warn("skipping: ", typeData);

          break;
      }
    }
  });

  return op;
}
