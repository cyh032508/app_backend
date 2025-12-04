/**
 * 抑制特定的 Node.js deprecation warnings
 * 這些警告來自第三方依賴（如 @google-cloud/vertexai），我們無法直接修復
 */

// 只在第一次載入時設置，避免重複處理
if (typeof process !== 'undefined' && process.emitWarning && !(process as any).__warningsSuppressed) {
  const originalEmitWarning = process.emitWarning;
  
  // 使用正確的類型簽名來覆蓋 process.emitWarning
  (process as any).emitWarning = function (
    warning: string | Error,
    typeOrOptions?: string | Function | { type?: string; code?: string; ctor?: Function },
    codeOrCtor?: string | Function,
    ctor?: Function
  ) {
    // 檢查是否是 DEP0169 url.parse() 警告
    let isUrlParseWarning = false;
    let code: string | undefined;
    
    // 處理不同的調用方式
    if (typeof typeOrOptions === 'object' && typeOrOptions !== null) {
      // 選項對象格式: emitWarning(warning, { type, code, ctor })
      code = typeOrOptions.code;
      isUrlParseWarning = code === 'DEP0169' || 
        (typeof warning === 'string' && warning.includes('url.parse()'));
    } else if (typeof typeOrOptions === 'string' && typeof codeOrCtor === 'string') {
      // 格式: emitWarning(warning, type, code, ctor)
      code = codeOrCtor;
      isUrlParseWarning = code === 'DEP0169' || 
        (typeof warning === 'string' && warning.includes('url.parse()'));
    } else if (typeof warning === 'string') {
      // 字符串警告，檢查內容
      isUrlParseWarning = warning.includes('url.parse()') || warning.includes('DEP0169');
    } else if (warning instanceof Error) {
      // Error 對象，檢查 message
      isUrlParseWarning = warning.message.includes('url.parse()') || warning.message.includes('DEP0169');
    }
    
    if (isUrlParseWarning) {
      // 抑制這個特定的警告，不顯示
      return;
    }
    
    // 其他警告正常顯示
    return originalEmitWarning.call(process, warning, typeOrOptions as any, codeOrCtor as any, ctor);
  };
  
  // 標記已經處理過，避免重複設置
  (process as any).__warningsSuppressed = true;
}

