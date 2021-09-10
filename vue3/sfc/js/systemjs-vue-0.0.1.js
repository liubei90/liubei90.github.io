var systemJSPrototype = System.constructor.prototype;

if (!VueCompilerSFC) {
    throw new Error('VueCompilerSFC 不存在，将不能解析 .vue 文件！');
}

function isVue(url) {
    return (url + "").indexOf(".vue") > -1;
}

systemJSPrototype.shouldFetch = function () {
    return true;
};

var fetch = systemJSPrototype.fetch;
systemJSPrototype.fetch = function (url, options) {
    return fetch(url, options).then(function (res) {
        if (!isVue(res.url)) {
            return res;
        }

        return res.text().then(function (source) {
            var id = hash.sum(url + source);
            var dataVId = 'data-v-' + id;
            var parseResult = VueCompilerSFC.parse(source, { sourceMap: false });
            var descriptor = parseResult.descriptor;
            var hasScoped = descriptor.styles.some((s) => s.scoped);

            var template = VueCompilerSFC.compileTemplate({ 
                id: id, 
                source: descriptor.template.content,
                scoped: hasScoped,
                compilerOptions: {
                    scopeId: hasScoped ? dataVId : undefined,
                }
            });
            var script = VueCompilerSFC.compileScript(descriptor, { 
                id: id,
                templateOptions: {
                    scoped: hasScoped,
                    compilerOptions: {
                        scopeId: hasScoped ? dataVId : undefined,
                    }
                },
            });

            // 处理 style 标签
            var styles = descriptor.styles;
            var styleCodes = [];

            if (styles.length) {
                for (var i = 0; i < styles.length; i++) {
                    var styleItem = styles[i];
                    styleCodes.push(VueCompilerSFC.compileStyle({ 
                        source: styleItem.content, 
                        id: dataVId,
                        scoped: styleItem.scoped,
                    }).code);
                }
            }

            var styleCode = styleCodes.join('\n');
            var styleUrl = url + '.css';

            styleCode = styleCode.replace(/url\(\s*(?:(["'])((?:\\.|[^\n\\"'])+)\1|((?:\\.|[^\s,"'()\\])+))\s*\)/g, function (match, quotes, relUrl1, relUrl2) {
                return 'url(' + quotes + resolveUrl(relUrl1 || relUrl2, styleUrl) + quotes + ')';
              });
            var styleSheet=new CSSStyleSheet();

            styleSheet.replaceSync(styleCode);
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, styleSheet];

            var renderName = '_sfc_render';
            var mainName = '_sfc_main';

            // 处理 template 标签
            var templateCode = template.code.replace(
                /\nexport (function|const) (render|ssrRender)/,
                '\n$1 _sfc_$2'
              );

            // 处理 script 标签
            var scriptCode = VueCompilerSFC.rewriteDefault(script.content, mainName);

            // 导出组件对象
            var output = [
                scriptCode,
                templateCode,

                mainName + '.render=' + renderName,
                'export default ' + mainName,
            ];

            if (hasScoped) {
                output.push(mainName + '.__scopeId = ' + JSON.stringify(dataVId));
            }

            var code = output.join('\n');

            console.log(code);

            return new Response(
                new Blob([code], { type: "application/javascript" })
            );
        });
    });
};


var backslashRegEx = /\\/g;
function resolveIfNotPlainOrUrl (relUrl, parentUrl) {
  if (relUrl.indexOf('\\') !== -1)
    relUrl = relUrl.replace(backslashRegEx, '/');
  // protocol-relative
  if (relUrl[0] === '/' && relUrl[1] === '/') {
    return parentUrl.slice(0, parentUrl.indexOf(':') + 1) + relUrl;
  }
  // relative-url
  else if (relUrl[0] === '.' && (relUrl[1] === '/' || relUrl[1] === '.' && (relUrl[2] === '/' || relUrl.length === 2 && (relUrl += '/')) ||
      relUrl.length === 1  && (relUrl += '/')) ||
      relUrl[0] === '/') {
    var parentProtocol = parentUrl.slice(0, parentUrl.indexOf(':') + 1);
    // Disabled, but these cases will give inconsistent results for deep backtracking
    //if (parentUrl[parentProtocol.length] !== '/')
    //  throw Error('Cannot resolve');
    // read pathname from parent URL
    // pathname taken to be part after leading "/"
    var pathname;
    if (parentUrl[parentProtocol.length + 1] === '/') {
      // resolving to a :// so we need to read out the auth and host
      if (parentProtocol !== 'file:') {
        pathname = parentUrl.slice(parentProtocol.length + 2);
        pathname = pathname.slice(pathname.indexOf('/') + 1);
      }
      else {
        pathname = parentUrl.slice(8);
      }
    }
    else {
      // resolving to :/ so pathname is the /... part
      pathname = parentUrl.slice(parentProtocol.length + (parentUrl[parentProtocol.length] === '/'));
    }

    if (relUrl[0] === '/')
      return parentUrl.slice(0, parentUrl.length - pathname.length - 1) + relUrl;

    // join together and split for removal of .. and . segments
    // looping the string instead of anything fancy for perf reasons
    // '../../../../../z' resolved to 'x/y' is just 'z'
    var segmented = pathname.slice(0, pathname.lastIndexOf('/') + 1) + relUrl;

    var output = [];
    var segmentIndex = -1;
    for (var i = 0; i < segmented.length; i++) {
      // busy reading a segment - only terminate on '/'
      if (segmentIndex !== -1) {
        if (segmented[i] === '/') {
          output.push(segmented.slice(segmentIndex, i + 1));
          segmentIndex = -1;
        }
      }

      // new segment - check if it is relative
      else if (segmented[i] === '.') {
        // ../ segment
        if (segmented[i + 1] === '.' && (segmented[i + 2] === '/' || i + 2 === segmented.length)) {
          output.pop();
          i += 2;
        }
        // ./ segment
        else if (segmented[i + 1] === '/' || i + 1 === segmented.length) {
          i += 1;
        }
        else {
          // the start of a new segment as below
          segmentIndex = i;
        }
      }
      // it is the start of a new segment
      else {
        segmentIndex = i;
      }
    }
    // finish reading out the last segment
    if (segmentIndex !== -1)
      output.push(segmented.slice(segmentIndex));
    return parentUrl.slice(0, parentUrl.length - pathname.length) + output.join('');
  }
}

function resolveUrl (relUrl, parentUrl) {
  return resolveIfNotPlainOrUrl(relUrl, parentUrl) || (relUrl.indexOf(':') !== -1 ? relUrl : resolveIfNotPlainOrUrl('./' + relUrl, parentUrl));
}