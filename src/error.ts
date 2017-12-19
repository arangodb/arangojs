import ExtendableError from "./util/error";

const messages: { [key: string]: string } = {
  0: "Network Error",
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  406: "Not Acceptable",
  407: "Proxy Authentication Required",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  411: "Length Required",
  412: "Precondition Failed",
  413: "Payload Too Large",
  414: "Request-URI Too Long",
  415: "Unsupported Media Type",
  416: "Requested Range Not Satisfiable",
  417: "Expectation Failed",
  418: "I'm a teapot",
  421: "Misdirected Request",
  422: "Unprocessable Entity",
  423: "Locked",
  424: "Failed Dependency",
  426: "Upgrade Required",
  428: "Precondition Required",
  429: "Too Many Requests",
  431: "Request Header Fields Too Large",
  444: "Connection Closed Without Response",
  451: "Unavailable For Legal Reasons",
  499: "Client Closed Request",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
  505: "HTTP Version Not Supported",
  506: "Variant Also Negotiates",
  507: "Insufficient Storage",
  508: "Loop Detected",
  510: "Not Extended",
  511: "Network Authentication Required",
  599: "Network Connect Timeout Error"
};

const nativeErrorKeys = [
  "fileName",
  "lineNumber",
  "columnNumber",
  "stack",
  "description",
  "number"
] as (keyof Error)[];

export class ArangoError extends ExtendableError {
  name = "ArangoError";
  isArangoError = true;
  errorNum: number;
  code: number;
  statusCode: number;
  response: any;
  constructor(response: any) {
    super();
    this.response = response;
    this.statusCode = response.statusCode;
    this.message = response.body.errorMessage;
    this.errorNum = response.body.errorNum;
    this.code = response.body.code;
    const err = new Error(this.message);
    err.name = this.name;
    for (const key of nativeErrorKeys) {
      if (err[key]) this[key as keyof this] = err[key];
    }
  }
}

export class HttpError extends ExtendableError {
  name = "HttpError";
  response: any;
  code: number;
  statusCode: number;
  constructor(response: any) {
    super();
    this.response = response;
    this.statusCode = response.statusCode || 500;
    this.message = messages[this.statusCode] || messages[500];
    this.code = this.statusCode;
    const err = new Error(this.message);
    err.name = this.name;
    for (const key of nativeErrorKeys) {
      if (err[key]) this[key as keyof this] = err[key];
    }
  }
}
