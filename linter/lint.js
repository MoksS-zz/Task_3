// eslint-disable-next-line max-classes-per-file
const escapedChars = {
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
  '"': '"',
  "/": "/",
  "\\": "\\"
};

const A_CODE = "a".charCodeAt(0);

const parse = (source, _, options) => {
  const pointers = {};
  let line = 0;
  let column = 0;
  let pos = 0;
  const bigint = options && options.bigint && typeof BigInt !== "undefined";
  return {
    data: _parse("", true),
    pointers
  };

  function _parse(ptr, topLevel) {
    whitespace();
    let data;
    map(ptr, "value");
    const char = getChar();
    switch (char) {
      case "t":
        read("rue");
        data = true;
        break;
      case "f":
        read("alse");
        data = false;
        break;
      case "n":
        read("ull");
        data = null;
        break;
      case '"':
        data = parseString();
        break;
      case "[":
        data = parseArray(ptr);
        break;
      case "{":
        data = parseObject(ptr);
        break;
      default:
        backChar();
        if ("-0123456789".indexOf(char) >= 0) data = parseNumber();
        else unexpectedToken();
    }
    map(ptr, "valueEnd");
    whitespace();
    if (topLevel && pos < source.length) unexpectedToken();
    return data;
  }

  function whitespace() {
    // eslint-disable-next-line no-labels
    loop: while (pos < source.length) {
      switch (source[pos]) {
        case " ":
          column++;
          break;
        case "\t":
          column += 4;
          break;
        case "\r":
          column = 0;
          break;
        case "\n":
          column = 0;
          line++;
          break;
        default:
          // eslint-disable-next-line no-labels
          break loop;
      }
      pos++;
    }
  }

  function parseString() {
    let str = "";
    let char;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      char = getChar();
      if (char === '"') {
        break;
      } else if (char === "\\") {
        char = getChar();
        if (char in escapedChars) str += escapedChars[char];
        else if (char === "u") str += getCharCode();
        else wasUnexpectedToken();
      } else {
        str += char;
      }
    }
    return str;
  }

  function parseNumber() {
    let numStr = "";
    let integer = true;
    if (source[pos] === "-") numStr += getChar();

    numStr += source[pos] === "0" ? getChar() : getDigits();

    if (source[pos] === ".") {
      numStr += getChar() + getDigits();
      integer = false;
    }

    if (source[pos] === "e" || source[pos] === "E") {
      numStr += getChar();
      if (source[pos] === "+" || source[pos] === "-") numStr += getChar();
      numStr += getDigits();
      integer = false;
    }

    const result = +numStr;
    return bigint &&
      integer &&
      (result > Number.MAX_SAFE_INTEGER || result < Number.MIN_SAFE_INTEGER)
      ? BigInt(numStr)
      : result;
  }

  function parseArray(ptr) {
    whitespace();
    const arr = [];
    let i = 0;
    if (getChar() === "]") return arr;
    backChar();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const itemPtr = `${ptr}/${i}`;
      arr.push(_parse(itemPtr));
      whitespace();
      const char = getChar();
      if (char === "]") break;
      if (char !== ",") wasUnexpectedToken();
      whitespace();
      i++;
    }
    return arr;
  }

  function parseObject(ptr) {
    whitespace();
    const obj = {};
    if (getChar() === "}") return obj;
    backChar();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const loc = getLoc();
      if (getChar() !== '"') wasUnexpectedToken();
      const key = parseString();
      const propPtr = `${ptr}/${escapeJsonPointer(key)}`;
      mapLoc(propPtr, "key", loc);
      map(propPtr, "keyEnd");
      whitespace();
      if (getChar() !== ":") wasUnexpectedToken();
      whitespace();
      obj[key] = _parse(propPtr);
      whitespace();
      const char = getChar();
      if (char === "}") break;
      if (char !== ",") wasUnexpectedToken();
      whitespace();
    }
    return obj;
  }

  function read(str) {
    for (let i = 0; i < str.length; i++)
      if (getChar() !== str[i]) wasUnexpectedToken();
  }

  function getChar() {
    checkUnexpectedEnd();
    const char = source[pos];
    pos++;
    column++; // new line?
    return char;
  }

  function backChar() {
    pos--;
    column--;
  }

  function getCharCode() {
    let count = 4;
    let code = 0;
    while (count--) {
      code <<= 4;
      const char = getChar().toLowerCase();
      if (char >= "a" && char <= "f") code += char.charCodeAt() - A_CODE + 10;
      else if (char >= "0" && char <= "9") code += +char;
      else wasUnexpectedToken();
    }
    return String.fromCharCode(code);
  }

  function getDigits() {
    let digits = "";
    while (source[pos] >= "0" && source[pos] <= "9") digits += getChar();

    if (digits.length) return digits;
    checkUnexpectedEnd();
    unexpectedToken();
  }

  function map(ptr, prop) {
    mapLoc(ptr, prop, getLoc());
  }

  function mapLoc(ptr, prop, loc) {
    pointers[ptr] = pointers[ptr] || {};
    pointers[ptr][prop] = loc;
  }

  function getLoc() {
    return {
      line: line + 1,
      column: column + 1,
      pos
    };
  }

  function unexpectedToken() {
    throw new SyntaxError(
      `Unexpected token ${source[pos]} in JSON at position ${pos}`
    );
  }

  function wasUnexpectedToken() {
    backChar();
    unexpectedToken();
  }

  function checkUnexpectedEnd() {
    if (pos >= source.length)
      throw new SyntaxError("Unexpected end of JSON input");
  }
};

const ESC_0 = /~/g;
const ESC_1 = /\//g;

function escapeJsonPointer(str) {
  return str.replace(ESC_0, "~0").replace(ESC_1, "~1");
}

//   __/\\\\\\_________________________________________
//    _\////\\\_________________________________________
//     ____\/\\\______/\\\_____________________/\\\______
//      ____\/\\\_____\///____/\\/\\\\\\_____/\\\\\\\\\\\_
//       ____\/\\\______/\\\__\/\\\////\\\___\////\\\////__
//        ____\/\\\_____\/\\\__\/\\\__\//\\\_____\/\\\______
//         ____\/\\\_____\/\\\__\/\\\___\/\\\_____\/\\\_/\\__
//          __/\\\\\\\\\__\/\\\__\/\\\___\/\\\_____\//\\\\\___
//           _\/////////___\///___\///____\///_______\/////____

const size = [
  "xxxs",
  "xxs",
  "xs",
  "s",
  "m",
  "l",
  "xl",
  "xxl",
  "xxxl",
  "xxxxl",
  "xxxxxl"
];

const market = new Set(["commercial", "offer"]);

const error = (result, obj, path) => {
  result.errors.push({
    key: obj.code,
    error: obj.error,
    loc: {
      start: {
        column: result.pointers[path].value.column,
        line: result.pointers[path].value.line,
        offset: result.pointers[path].value.pos
      },
      end: {
        column: result.pointers[path].valueEnd.column,
        line: result.pointers[path].valueEnd.line,
        offset: result.pointers[path].valueEnd.pos
      }
    }
  });
};

class Warning {
  constructor(obj) {
    this.text = {
      code: "WARNING.TEXT_SIZES_SHOULD_BE_EQUAL",
      mods: { size: obj.size || "none" },
      error: "Тексты в блоке warning должны быть одного размера"
    };

    this.button = {
      code: "WARNING.INVALID_BUTTON_SIZE",
      error: "Размер кнопки блока warning должен быть на 1 шаг больше текста",
      mods: { size: obj.size || "none" },
      pathText: [],
      pathPlaceholder: []
    };

    this.placeholder = {
      code: "WARNING.INVALID_PLACEHOLDER_SIZE",
      error: "Недопустимые размеры для блока placeholder",
      mods: { size: ["s", "m", "l"] }
    };

    this.sequence = {
      code: "WARNING.INVALID_BUTTON_POSITION",
      error: "Блок button не может находиться перед блоком placeholder"
    };
  }

  static check(result, obj, rule, path) {
    if (obj.block === "text") {
      if (rule.text.mods.size === "none") {
        if (!obj.mods) return;
        const sizeButton = size[size.indexOf(obj.mods.size) + 1];
        rule.text.mods.size = obj.mods.size;

        if (rule.button.mods.size === "none") {
          rule.button.pathText.forEach(e => {
            if (e.size === sizeButton) return;
            error(result, rule.button, `${e.path}/mods/size`);
          });

          rule.button.pathText.length = 0;
        }

        rule.button.mods.size = sizeButton;
        return;
      }

      if (rule.text.mods.size !== obj.mods.size) {
        error(result, rule.text, `${path}/mods/size`);

        rule.text.pass = false;
      }
      return;
    }

    if (obj.block === "button") {
      rule.button.pathPlaceholder.push(path);

      if (!obj.mods) return;

      if (rule.button.mods.size === "none") {
        rule.button.pathText.push({ size: obj.mods.size, path });
        return;
      }
      if (rule.button.mods.size !== obj.mods.size) {
        error(result, rule.button, `${path}/mods/size`);
      }
      return;
    }

    if (obj.block === "placeholder") {
      if (rule.button.pathPlaceholder.length > 0) {
        rule.button.pathPlaceholder.forEach(e => {
          error(result, rule.sequence, e);
        });
        rule.button.pathPlaceholder.length = 0;
      }

      if (!obj.mods) return;

      if (!rule.placeholder.mods.size.includes(obj.mods.size)) {
        error(result, rule.placeholder, `${path}/mods/size`);
      }
    }
  }
}

class Header {
  constructor() {
    this.h1 = {
      code: "TEXT.SEVERAL_H1",
      error: "Заголовок h1 на странице должен быть единственным",
      available: false
    };

    this.h2 = {
      code: "TEXT.INVALID_H2_POSITION",
      error: "Заголовок h2  не может находиться перед заголовком h1",
      path: []
    };

    this.h3 = {
      code: "TEXT.INVALID_H3_POSITION",
      error: "Заголовок h3 не может находиться перед заголовком h2",
      path: []
    };
  }

  static check(result, obj, rule, path) {
    if (obj.block !== "text" || !obj.mods) return;
    switch (obj.mods.type) {
      case "h1":
        if (rule.h1.available) {
          error(result, rule.h1, `${path}/mods/type`);
        }
        rule.h1.available = true;

        if (rule.h2.path.length > 0) {
          rule.h2.path.forEach(e => {
            error(result, rule.h2, `${e}/mods/type`);
          });
          rule.h2.path.length = 0;
        }
        break;

      case "h2":
        rule.h2.path.push(path);

        if (rule.h3.path.length > 0) {
          rule.h3.path.forEach(e => {
            error(result, rule.h3, `${e}/mods/type`);
          });
          rule.h3.path.length = 0;
        }
        break;

      case "h3":
        rule.h3.path.push(path);
        break;
    }
  }
}

class Grid {
  constructor(obj) {
    this.code = "GRID.TOO_MUCH_MARKETING_BLOCKS";
    this.error = "маркетинговые блоки занимают больше половины блока grid";
    this.count = 0;
    this.total = obj.total;
    this.market = 0;
    this.path = obj.path;
  }

  static check(result,obj, rule) {
    if (market.has(obj.block)) {
      rule.market += rule.count;

      if (rule.total / 2 < rule.market) {
        error(result, rule, rule.path);
      }
    }
  }
}

function reqcursion(result, obj, path = "", rule = {}) {
  rule = { ...rule };
  if (Array.isArray(obj)) {
    obj.forEach((e, i) => {
      reqcursion(result, e, `${path}/${i}`, rule);
    });
    return;
  }

  if (obj.block === "warning" && !obj.elem) {
    rule.warning = new Warning({ path });
  } else if (obj.block === "page" && !obj.elem) {
    rule.header = new Header();
  } else if (obj.block === "grid" && obj.mods) {
    rule.grid = new Grid({ path, total: +obj.mods["m-columns"] });
  } else if (obj.block === "grid" && obj.elemMods) {
    rule.grid.count = +obj.elemMods["m-col"];
  }

  if (obj.content && Array.isArray(obj.content)) {
    const newPath = `${path}/content`;
    reqcursion(result, obj.content, newPath, rule);
    return;
  }

  if (typeof obj.content === "object" && obj.content !== null) {
    const newPath = `${path}/content`;
    reqcursion(result, obj.content, newPath, rule);
    return;
  }

  if (rule.hasOwnProperty("warning")) {
    Warning.check(result, obj, rule.warning, path);
  } else if (rule.hasOwnProperty("header")) {
    Header.check(result, obj, rule.header, path);
  } else if (rule.hasOwnProperty("grid")) {
    Grid.check(result, obj, rule.grid, path);
  }
}

/**
 * @param {string} str
 * @return {Array}
 */

function lint(str) {
  const obj = parse(str);

  const result = {
    errors: [],
    pointers: obj.pointers
  }
  reqcursion(result, obj.data);

  return result.errors;
}

module.exports = {
  lint,
  parse
}