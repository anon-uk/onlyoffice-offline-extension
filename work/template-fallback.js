// Interpret dynamically assembled UI templates without eval or Function.
(function () {
  var cache = new Map();
  var precompiled = __officeCompiledFunction;
  __officeCompiledFunction = function (body) {
    if (cache.has(body)) return cache.get(body);
    var fn;
    try { fn = precompiled(body); }
    catch (_) {
      var interpreter = new Sval({ ecmaVer: 'latest', sourceType: 'script', sandBox: true });
      interpreter.import('templateGlobals', window);
      interpreter.run('with(templateGlobals){exports.render=function(obj,_){' + body + '};}');
      fn = interpreter.exports.render;
    }
    cache.set(body, fn);
    return fn;
  };
}());
