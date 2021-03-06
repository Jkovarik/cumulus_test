# @cumulus/common API Documentation

## Modules

<dl>
<dt><a href="#module_string">string</a></dt>
<dd><p>A collection of utilities for working with URLs</p>
</dd>
<dt><a href="#module_URLUtils">URLUtils</a></dt>
<dd><p>A collection of utilities for working with URLs</p>
</dd>
<dt><a href="#module_util">util</a></dt>
<dd><p>Simple utility functions</p>
</dd>
</dl>

<a name="module_string"></a>

## string
A collection of utilities for working with URLs

**Example**  
```js
const { toLower } = require('@cumulus/common/string');

toLower('aSDf'); // => 'asdf'
```

* [string](#module_string)
    * [.unicodeEscape(str, regex)](#module_string.unicodeEscape) ⇒ <code>string</code>
    * [.globalReplace(string, oldSubString, newSubString)](#module_string.globalReplace) ⇒ <code>string</code>
    * [.toLower(str)](#module_string.toLower) ⇒ <code>string</code>
    * [.toUpper(str)](#module_string.toUpper) ⇒ <code>string</code>
    * [.match(regexp, str)](#module_string.match) ⇒ <code>Array</code> \| <code>null</code>
    * [.matches(regexp, str)](#module_string.matches) ⇒ <code>boolean</code>
    * [.isValidHostname(hostname)](#module_string.isValidHostname) ⇒ <code>boolean</code>

<a name="module_string.unicodeEscape"></a>

### string.unicodeEscape(str, regex) ⇒ <code>string</code>
Given a string, replaces all characters matching the passed regex with their unicode
escape sequences

**Kind**: static method of [<code>string</code>](#module_string)  
**Returns**: <code>string</code> - The string with characters unicode-escaped  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| str | <code>string</code> |  | The string to escape |
| regex | <code>string</code> | <code>&quot;&lt;RegExp /[\\s\\S]/g&gt;&quot;</code> | The regex matching characters to replace (default: all chars) |

<a name="module_string.globalReplace"></a>

### string.globalReplace(string, oldSubString, newSubString) ⇒ <code>string</code>
Globally replaces oldSubstring in string with newSubString

**Kind**: static method of [<code>string</code>](#module_string)  
**Returns**: <code>string</code> - the modified string  

| Param | Type | Description |
| --- | --- | --- |
| string | <code>string</code> | The string to modify |
| oldSubString | <code>string</code> | The string to replace |
| newSubString | <code>string</code> | The string replacement |

<a name="module_string.toLower"></a>

### string.toLower(str) ⇒ <code>string</code>
Converts string, as a whole, to lower case just like String#toLowerCase

**Kind**: static method of [<code>string</code>](#module_string)  
**Returns**: <code>string</code> - the lower-cased string  

| Param | Type | Description |
| --- | --- | --- |
| str | <code>string</code> | the string to convert |

<a name="module_string.toUpper"></a>

### string.toUpper(str) ⇒ <code>string</code>
Converts string, as a whole, to upper case just like String#toUpperCase

**Kind**: static method of [<code>string</code>](#module_string)  
**Returns**: <code>string</code> - the upper-cased string  

| Param | Type | Description |
| --- | --- | --- |
| str | <code>string</code> | the string to convert |

<a name="module_string.match"></a>

### string.match(regexp, str) ⇒ <code>Array</code> \| <code>null</code>
Tests a regular expression against a String, returning matches

Produces same output as https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match

This is a curried function - https://lodash.com/docs/4.17.11#curry

**Kind**: static method of [<code>string</code>](#module_string)  

| Param | Type | Description |
| --- | --- | --- |
| regexp | <code>RegExp</code> | the pattern to match against |
| str | <code>string</code> | the string to match against |

<a name="module_string.matches"></a>

### string.matches(regexp, str) ⇒ <code>boolean</code>
Tests a regular expression against a string, returning true / false

This is a curried function - https://lodash.com/docs/4.17.11#curry

**Kind**: static method of [<code>string</code>](#module_string)  
**Returns**: <code>boolean</code> - true if the pattern matches the string, false otherwise  

| Param | Type | Description |
| --- | --- | --- |
| regexp | <code>RegExp</code> | the pattern to match against |
| str | <code>string</code> | the string to match against |

**Example**  
```js
const isCapitalized = matches(/^[A-Z]/);
isCapitalized('Joe'); // => true
```
<a name="module_string.isValidHostname"></a>

### string.isValidHostname(hostname) ⇒ <code>boolean</code>
Test if a string is a valid hostname, as defined by [RFC1123](https://tools.ietf.org/html/rfc1123#page-13)

**Kind**: static method of [<code>string</code>](#module_string)  

| Param | Type | Description |
| --- | --- | --- |
| hostname | <code>String</code> | the string to test |

**Example**  
```js
isValidHostname('example.com'); // => true
isValidHostname('as!@#'); // => false
isValidHostname('127.0.0.1'); // => false
```
<a name="module_URLUtils"></a>

## URLUtils
A collection of utilities for working with URLs

**Example**  
```js
const { buildURL } = require('@cumulus/common/URLUtils');

buildURL({ protocol: 'http', host: 'example.com' }); // => 'http://example.com'
```
<a name="module_URLUtils.buildURL"></a>

### URLUtils.buildURL(params) ⇒ <code>string</code>
Build a URL

**Kind**: static method of [<code>URLUtils</code>](#module_URLUtils)  
**Returns**: <code>string</code> - a URL  
**Throws**:

- <code>TypeError</code> if protocol or host are not specified


| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | URL parameters |
| params.protocol | <code>string</code> | the protocol ('http', 'ftp', 's3', etc) |
| params.host | <code>string</code> | the host |
| [params.port] | <code>string</code> \| <code>integer</code> | the port |
| [params.path] | <code>string</code> \| <code>Array.&lt;string&gt;</code> | path segment(s) to add to the end of   the URL.  Can be either a string or an array of strings, which will be   joined together. |

**Example**  
```js
buildURL({
  protocol: 'http'
  host: 'example.com',
  port: 8080,
  path: ['path', 'to', 'file.txt']
}); // => 'http://example.com:8080/path/to/file.txt'
```
<a name="module_util"></a>

## util
Simple utility functions

**Example**  
```js
const { isNil } = require('@cumulus/common/util');

isNil(undefined); // => true
```

* [util](#module_util)
    * [.deprecate(name, version, [alternative])](#module_util.deprecate)
    * [.sleep(waitPeriodMs)](#module_util.sleep) ⇒ <code>Promise.&lt;undefined&gt;</code>
    * [.uuid()](#module_util.uuid) ⇒ <code>string</code>
    * [.noop()](#module_util.noop) ⇒ <code>undefined</code>
    * [.omit(objectIn, keys)](#module_util.omit) ⇒ <code>Object</code>
    * [.negate(predicate)](#module_util.negate) ⇒ <code>function</code>
    * [.isNull(x)](#module_util.isNull) ⇒ <code>boolean</code>
    * [.isUndefined(x)](#module_util.isUndefined) ⇒ <code>boolean</code>
    * [.isNil(x)](#module_util.isNil) ⇒ <code>boolean</code>

<a name="module_util.deprecate"></a>

### util.deprecate(name, version, [alternative])
Mark a piece of code as deprecated

**Kind**: static method of [<code>util</code>](#module_util)  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | the name of the function / method / class to deprecate |
| version | <code>string</code> | the version after which the code will be marked   as deprecated |
| [alternative] | <code>string</code> | the function / method / class to use instead   of this deprecated code |

<a name="module_util.sleep"></a>

### util.sleep(waitPeriodMs) ⇒ <code>Promise.&lt;undefined&gt;</code>
Wait for the defined number of milliseconds

**Kind**: static method of [<code>util</code>](#module_util)  
**Returns**: <code>Promise.&lt;undefined&gt;</code> - promise resolves after a given time period  

| Param | Type | Description |
| --- | --- | --- |
| waitPeriodMs | <code>number</code> | number of milliseconds to wait |

<a name="module_util.uuid"></a>

### util.uuid() ⇒ <code>string</code>
Generate and return an RFC4122 v4 UUID.

**Kind**: static method of [<code>util</code>](#module_util)  
**Returns**: <code>string</code> - An RFC44122 v4 UUID.  
<a name="module_util.noop"></a>

### util.noop() ⇒ <code>undefined</code>
Does nothing.  Used where a callback is required but not used.

**Kind**: static method of [<code>util</code>](#module_util)  
**Returns**: <code>undefined</code> - undefined  
<a name="module_util.omit"></a>

### util.omit(objectIn, keys) ⇒ <code>Object</code>
Replacement for lodash.omit returns a shallow copy of input object
with keys removed.
(lodash.omit will be removed in v5.0.0)
https://github.com/lodash/lodash/wiki/Roadmap#v500-2019

**Kind**: static method of [<code>util</code>](#module_util)  
**Returns**: <code>Object</code> - copy of objectIn without keys attached.  

| Param | Type | Description |
| --- | --- | --- |
| objectIn | <code>Object</code> | input object |
| keys | <code>string</code> \| <code>Array.&lt;string&gt;</code> | key or list of keys to remove from object |

<a name="module_util.negate"></a>

### util.negate(predicate) ⇒ <code>function</code>
Creates a function that returns the opposite of the predicate function.

**Kind**: static method of [<code>util</code>](#module_util)  
**Returns**: <code>function</code> - the new negated function  

| Param | Type | Description |
| --- | --- | --- |
| predicate | <code>function</code> | the predicate to negate |

**Example**  
```js
const isEven = (x) => x % 2 === 0;
const isOdd = negate(isEven);

isOdd(2); // => false
isOdd(3); // => true
```
<a name="module_util.isNull"></a>

### util.isNull(x) ⇒ <code>boolean</code>
Test if a value is null

**Kind**: static method of [<code>util</code>](#module_util)  

| Param | Type | Description |
| --- | --- | --- |
| x | <code>\*</code> | value to check |

<a name="module_util.isUndefined"></a>

### util.isUndefined(x) ⇒ <code>boolean</code>
Test if a value is undefined

**Kind**: static method of [<code>util</code>](#module_util)  

| Param | Type | Description |
| --- | --- | --- |
| x | <code>\*</code> | value to check |

<a name="module_util.isNil"></a>

### util.isNil(x) ⇒ <code>boolean</code>
Test if a value is null or undefined

**Kind**: static method of [<code>util</code>](#module_util)  

| Param | Type | Description |
| --- | --- | --- |
| x | <code>\*</code> | value to check |


---

Generated automatically using `npm run build-docs`
