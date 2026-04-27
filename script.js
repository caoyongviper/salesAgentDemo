const chatContainer = document.getElementById('chatContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

const API_ENDPOINT = '/.netlify/functions/api';

let isStreaming = false;
let streamTimeout = null;
let currentThinkingInstance = null;

async function getResponseFromBackend(text) {
    const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: text })
    });
    return await response.json();
}

function autoResizeTextarea() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
    
    const hasContent = messageInput.value.trim().length > 0;
    sendBtn.disabled = !hasContent;
}

messageInput.addEventListener('input', autoResizeTextarea);

function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function sendSuggestion(text) {
    messageInput.value = text;
    autoResizeTextarea();
    sendMessage();
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addMessage(content, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = '<img src="thinker-logo.png" width="48" height="48" style="border-radius: 50%;">';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (isUser) {
        contentDiv.textContent = content;
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    chatContainer.appendChild(messageDiv);
    
    scrollToBottom();
    
    return { messageDiv, contentDiv };
}

function addTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai-message';
    typingDiv.id = 'typingIndicator';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = '<img src="thinker-logo.png" width="48" height="48" style="border-radius: 50%;">';
    
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    
    typingDiv.appendChild(avatar);
    typingDiv.appendChild(indicator);
    chatContainer.appendChild(typingDiv);
    
    scrollToBottom();
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

function markdownToHtml(markdown) {
    let html = markdown;
    
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/\*\*(.*)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*)\*/g, '<em>$1</em>');
    html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
    html = html.replace(/\|\s*(.*)\s*\|/g, (match, content) => `<td>${content.trim()}</td>`);
    
    let inTable = false;
    const lines = html.split('\n');
    const result = [];
    
    lines.forEach(line => {
        if (line.includes('<td>') && !inTable) {
            result.push('<table><tr>');
            inTable = true;
        }
        if (inTable && line.trim() === '' && result[result.length - 1].includes('</tr>')) {
            result.push('</table>');
            inTable = false;
        } else if (line.includes('<td>') && inTable && result.join('').includes('</tr>')) {
            result.push('</tr><tr>');
            result.push(line);
        } else {
            result.push(line);
        }
    });
    
    if (inTable) {
        result.push('</tr></table>');
    }
    
    html = result.join('\n');
    
    html = html.replace(/^\>(.*)$/gm, '<blockquote>$1</blockquote>');
    
    html = html.replace(/\n\n/g, '<br><br>');
    
    return html;
}

function streamResponse(content, contentDiv, callback) {
    let index = 0;
    const speed = 15;
    let htmlBuffer = '';
    const isMarkdown = content.includes('# ') || content.includes('## ') || content.includes('|');
    
    isStreaming = true;
    updateSendButton();
    
    function typeNext() {
        if (!isStreaming) {
            if (callback) {
                callback();
            }
            return;
        }
        if (index < content.length) {
            htmlBuffer += content.charAt(index);
            if (isMarkdown) {
                contentDiv.innerHTML = markdownToHtml(htmlBuffer);
            } else {
                contentDiv.textContent = htmlBuffer;
            }
            index++;
            scrollToBottom();
            streamTimeout = setTimeout(typeNext, speed);
        } else if (callback) {
            isStreaming = false;
            updateSendButton();
            callback();
        }
    }
    
    typeNext();
}

function stopStreaming() {
    isStreaming = false;
    if (streamTimeout) {
        clearTimeout(streamTimeout);
        streamTimeout = null;
    }
    if (currentThinkingInstance) {
        currentThinkingInstance.stop();
        currentThinkingInstance = null;
    }
    updateSendButton();
}

function updateSendButton() {
    if (isStreaming) {
        // 停止按钮 - 使用简单的方形图标
        sendBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        sendBtn.disabled = false;
        sendBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        sendBtn.style.border = 'none';
        sendBtn.style.outline = 'none';
        sendBtn.style.boxShadow = 'none';
        sendBtn.style.color = 'white';
    } else {
        // 发送按钮 - 使用原始的纸飞机图标
        sendBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24"><path d="M22 2L11 13" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 2L15 22L11 13L2 8L22 2Z" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        sendBtn.style.background = 'linear-gradient(135deg, var(--primary-blue), var(--secondary-blue))';
        sendBtn.style.border = 'none';
        sendBtn.style.outline = 'none';
        sendBtn.style.boxShadow = 'none';
        sendBtn.style.color = 'white';
        const hasContent = messageInput.value.trim().length > 0;
        sendBtn.disabled = !hasContent;
    }
}

function addSuggestions(suggestions, contentDiv) {
    if (!suggestions || suggestions.length === 0) {
        return;
    }

    const suggestionsSection = document.createElement('div');
    suggestionsSection.className = 'suggestions-section';

    const suggestionsTitle = document.createElement('div');
    suggestionsTitle.className = 'suggestions-title';
    suggestionsTitle.textContent = '建议你：';

    const suggestionsList = document.createElement('div');
    suggestionsList.className = 'suggestions-list';

    suggestions.forEach(suggestion => {
        const link = document.createElement('span');
        link.className = 'suggestion-link';
        link.textContent = suggestion;
        link.onclick = () => {
            messageInput.value = suggestion;
            autoResizeTextarea();
            messageInput.focus();
        };
        suggestionsList.appendChild(link);
    });

    suggestionsSection.appendChild(suggestionsTitle);
    suggestionsSection.appendChild(suggestionsList);
    contentDiv.appendChild(suggestionsSection);
    scrollToBottom();
}

function addThinking(thinkingSteps, callback) {
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'message ai-message';
    thinkingDiv.id = 'thinkingProcess';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = '<img src="thinker-logo.png" width="48" height="48" style="border-radius: 50%;">';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.style.background = 'transparent';
    
    const thinkingText = document.createElement('div');
    thinkingText.className = 'thinking-text';
    
    contentDiv.appendChild(thinkingText);
    thinkingDiv.appendChild(avatar);
    thinkingDiv.appendChild(contentDiv);
    chatContainer.appendChild(thinkingDiv);
    
    scrollToBottom();
    
    isStreaming = true;
    updateSendButton();
    
    let stepIndex = 0;
    let charIndex = 0;
    let thinkingTimeout = null;
    
    function typeStep() {
        if (!isStreaming) {
            if (callback) {
                callback();
            }
            return;
        }
        
        if (stepIndex >= thinkingSteps.length) {
            isStreaming = false;
            updateSendButton();
            scrollToBottom();
            setTimeout(callback, 500);
            return;
        }
        
        const currentStep = thinkingSteps[stepIndex];
        if (charIndex < currentStep.length) {
            thinkingText.innerHTML += currentStep[charIndex];
            charIndex++;
            scrollToBottom();
            thinkingTimeout = setTimeout(typeStep, 30);
        } else {
            thinkingText.innerHTML += '<br>';
            stepIndex++;
            charIndex = 0;
            scrollToBottom();
            thinkingTimeout = setTimeout(typeStep, 200);
        }
    }
    
    typeStep();
    
    return {
        stop: function() {
            isStreaming = false;
            if (thinkingTimeout) {
                clearTimeout(thinkingTimeout);
                thinkingTimeout = null;
            }
            updateSendButton();
        }
    };
}

function removeThinking() {
    const thinking = document.getElementById('thinkingProcess');
    if (thinking) {
        thinking.remove();
    }
}

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;
    
    addMessage(text, true);
    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendBtn.disabled = true;
    
    addTypingIndicator();
    
    try {
        const data = await getResponseFromBackend(text);
        removeTypingIndicator();
        
        currentThinkingInstance = addThinking(data.thinking, () => {
            removeThinking();
            currentThinkingInstance = null;
            
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ai-message';
            
            const avatar = document.createElement('div');
            avatar.className = 'message-avatar';
            avatar.innerHTML = '<img src="thinker-logo.png" width="48" height="48" style="border-radius: 50%;">';
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            
            messageDiv.appendChild(avatar);
            messageDiv.appendChild(contentDiv);
            chatContainer.appendChild(messageDiv);
            
            if (data.response && data.response.startsWith('[')) {
                try {
                    const responseData = JSON.parse(data.response);
                    let index = 0;
                    
                    function showNextItem() {
                        if (index < responseData.length) {
                            const item = responseData[index];
                            
                            // 检查是否是标讯数据
                            if (item['公告名称'] || item['标题']) {
                                // 渲染标讯卡片
                                const bidHtml = `
                                    <div style="background: #ffffff; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
                                        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px;">
                                            <h2 style="font-size: 16px; font-weight: 600; color: #1e293b; margin: 0;">${item['公告名称'] || item['标题']}</h2>
                                            <div style="display: flex; gap: 8px; align-self: flex-start;">
                                                <button onclick="viewBidDetail('${item['公告名称'] || item['标题']}')" style="background: #f8fafc; color: #2563eb; border: 1px solid #2563eb; border-radius: 6px; padding: 8px 16px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s ease;">查看标讯</button>
                                                <button onclick="sendSuggestion('${item['采购单位']} 标讯转商机')" style="background: linear-gradient(135deg, #2563eb, #0ea5e9); color: white; border: none; border-radius: 6px; padding: 8px 16px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s ease;">一键转商机</button>
                                            </div>
                                        </div>
                                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin-bottom: 12px;">
                                            <div>
                                                <strong style="color: #64748b; font-size: 12px;">采购单位：</strong>
                                                <span style="color: #1e293b; font-size: 14px;">${item['采购单位']}</span>
                                            </div>
                                            <div>
                                                <strong style="color: #64748b; font-size: 12px;">项目名称：</strong>
                                                <span style="color: #1e293b; font-size: 14px;">${item['项目名称']}</span>
                                            </div>
                                            <div>
                                                <strong style="color: #64748b; font-size: 12px;">地区：</strong>
                                                <span style="color: #1e293b; font-size: 14px;">${item['省份']} ${item['城市']}</span>
                                            </div>
                                            <div>
                                                <strong style="color: #64748b; font-size: 12px;">行业：</strong>
                                                <span style="color: #1e293b; font-size: 14px;">${item['主行业']}</span>
                                            </div>
                                            <div>
                                                <strong style="color: #64748b; font-size: 12px;">预算：</strong>
                                                <span style="color: #ef4444; font-weight: 500; font-size: 14px;">${item['预算金额（万元）']}万元</span>
                                            </div>
                                            <div>
                                                <strong style="color: #64748b; font-size: 12px;">关键词：</strong>
                                                <span style="color: #1e293b; font-size: 14px;">${item['关键词']}</span>
                                            </div>
                                        </div>
                                        <div style="margin-top: 12px;">
                                            <strong style="color: #64748b; font-size: 12px;">需求概况：</strong>
                                            <p style="color: #1e293b; line-height: 1.5; margin: 8px 0 0; font-size: 14px;">${item['采购需求概况']}</p>
                                        </div>
                                    </div>
                                `;
                                contentDiv.innerHTML += bidHtml;
                            } else if (item['动态内容']) {
                                // 渲染客户动态卡片 - 使用本地缩略图
                                let imageUrl = '';
                                if (item['客户名称'].includes('比亚迪')) {
                                    imageUrl = './byd-factory.png';
                                } else if (item['客户名称'] === '宁德时代') {
                                    imageUrl = './catl-headquarters.png';
                                } else if (item['客户名称'].includes('长安')) {
                                    imageUrl = './changan-construction.png';
                                }
                                
                                const newsHtml = `
                                    <div style="background: #ffffff; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
                                        <div style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start;">
                                            <div style="display: flex; gap: 12px; align-items: center; width: 100%;">
                                                <div style="width: 80px; height: 80px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; flex-shrink: 0;">
                                                    <img src="${imageUrl}" alt="${item['客户名称']}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none';this.parentElement.style.background='linear-gradient(135deg, #2563eb, #0ea5e9);this.parentElement.innerHTML='${item['客户名称'].charAt(0)}';this.parentElement.style.color='white';this.parentElement.style.fontSize='24px';this.parentElement.style.fontWeight='bold';"/>
                                                </div>
                                                <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                                                    <div style="display: flex; align-items: center; gap: 8px;">
                                                        <span style="display: inline-block; width: 8px; height: 8px; background: linear-gradient(135deg, #2563eb, #0ea5e9); border-radius: 50%;"></span>
                                                        <span style="font-size: 13px; color: #2563eb; font-weight: 600;">${item['客户名称']}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style="width: 100%;">
                                                <p style="margin: 0; color: #1e293b; line-height: 1.7; font-size: 14px; cursor: pointer;" onmouseover="this.style.textDecoration='underline'; this.style.textDecorationColor='#2563eb';" onmouseout="this.style.textDecoration='none';">${item['动态内容']}</p>
                                            </div>
                                          </div>
                                      </div>
                                  `;
                                contentDiv.innerHTML += newsHtml;
                            } else if (item['客户类型']) {
                                // 渲染高价值客户卡片 - 响应式布局
                                const customerHtml = `
                                    <div style="background: #ffffff; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
                                        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px;">
                                            <h2 style="font-size: 16px; font-weight: 600; color: #1e293b; margin: 0;">${item['客户类型']}-<span style="color: #2563eb; font-weight: 700;">${item['客户名称']}</span></h2>
                                            <button onclick="viewCustomerAnalysis('${item['客户名称']}')" style="background: #f8fafc; color: #2563eb; border: 1px solid #2563eb; border-radius: 6px; padding: 8px 16px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s ease; align-self: flex-start;" onmouseover="this.style.background='#e0e7ff'; this.style.borderColor='#1d4ed8';" onmouseout="this.style.background='#f8fafc'; this.style.borderColor='#2563eb';">客户洞察</button>
                                        </div>
                                        <div style="margin-bottom: 12px;">
                                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding: 8px 12px; background: #f8fafc; border-radius: 6px;">
                                                <strong style="color: #64748b; font-size: 13px; white-space: nowrap;">客户名称：</strong>
                                                <span style="color: #1e293b; font-size: 14px; font-weight: 500;">${item['客户名称']}</span>
                                            </div>
                                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                                                <div style="display: flex; align-items: center; gap: 6px; padding: 6px 8px; background: #f8fafc; border-radius: 4px;">
                                                    <strong style="color: #64748b; font-size: 12px; white-space: nowrap;">行业：</strong>
                                                    <span style="color: #1e293b; font-size: 14px;">${item['行业']}</span>
                                                </div>
                                                <div style="display: flex; align-items: center; gap: 6px; padding: 6px 8px; background: #f8fafc; border-radius: 4px;">
                                                    <strong style="color: #64748b; font-size: 12px; white-space: nowrap;">一级：</strong>
                                                    <span style="color: #1e293b; font-size: 14px;">${item['一级子行业']}</span>
                                                </div>
                                                <div style="display: flex; align-items: center; gap: 6px; padding: 6px 8px; background: #f8fafc; border-radius: 4px;">
                                                    <strong style="color: #64748b; font-size: 12px; white-space: nowrap;">二级：</strong>
                                                    <span style="color: #1e293b; font-size: 14px;">${item['二级子行业']}</span>
                                                </div>
                                                <div style="display: flex; align-items: center; gap: 6px; padding: 6px 8px; background: #f8fafc; border-radius: 4px;">
                                                    <strong style="color: #64748b; font-size: 12px; white-space: nowrap;">战区：</strong>
                                                    <span style="color: #1e293b; font-size: 14px;">${item['战区']}</span>
                                                </div>
                                                <div style="display: flex; align-items: center; gap: 6px; padding: 6px 8px; background: #f8fafc; border-radius: 4px;">
                                                    <strong style="color: #64748b; font-size: 12px; white-space: nowrap;">大区：</strong>
                                                    <span style="color: #1e293b; font-size: 14px;">${item['大区']}</span>
                                                </div>
                                                <div style="display: flex; align-items: center; gap: 6px; padding: 6px 8px; background: #f8fafc; border-radius: 4px;">
                                                    <strong style="color: #64748b; font-size: 12px; white-space: nowrap;">纵队：</strong>
                                                    <span style="color: #1e293b; font-size: 14px;">${item['行业纵队']}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 12px 0;">
                                        <div style="padding: 8px 0; display: flex; flex-direction: column; gap: 12px;">
                                            <img src="${item['客户名称'].includes('荣耀') ? './rongyao.png' : './jd.png'}" alt="新闻缩略图" style="width: 100%; height: 160px; border-radius: 8px; object-fit: cover; border: 1px solid #e2e8f0;">
                                            <div>
                                                <a href="${item['新闻链接']}" target="_blank" style="font-size: 14px; font-weight: 600; color: #2563eb; text-decoration: none; cursor: pointer; line-height: 1.5; display: inline-block; margin-bottom: 8px;" onmouseover="this.style.textDecoration='underline';" onmouseout="this.style.textDecoration='none';">${item['新闻标题']}</a>
                                                <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">${item['新闻摘要']}</p>
                                            </div>
                                        </div>
                                    </div>
                                `;
                                contentDiv.innerHTML += customerHtml;
                            } else if (item['任务类型']) {
                                // 渲染任务卡片
                                const taskHtml = `
                                    <div style="background: #ffffff; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
                                        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px;">
                                            <h2 style="font-size: 16px; font-weight: 600; color: #1e293b; margin: 0;">${item['任务类型']}-<span style="color: #2563eb; font-weight: 700;">${item['客户名称']}</span></h2>
                                            <div style="display: flex; gap: 8px; align-self: flex-start;">
                                                <button onclick="viewCustomerAnalysis('${item['客户名称']}')" style="background: #f8fafc; color: #2563eb; border: 1px solid #2563eb; border-radius: 6px; padding: 8px 16px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s ease;">客户分析</button>
                                                <button style="background: linear-gradient(135deg, #2563eb, #0ea5e9); color: white; border: none; border-radius: 6px; padding: 8px 16px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s ease;">处理任务</button>
                                            </div>
                                        </div>
                                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin-bottom: 12px;">
                                            <div>
                                                <strong style="color: #64748b; font-size: 12px;">客户名称：</strong>
                                                <span style="color: #1e293b; font-size: 14px;">${item['客户名称']}</span>
                                            </div>
                                            <div>
                                                <strong style="color: #64748b; font-size: 12px;">任务状态：</strong>
                                                <span style="color: #1e293b; font-size: 14px;">${item['任务状态']}</span>
                                            </div>
                                            <div>
                                                <strong style="color: #64748b; font-size: 12px;">拜访场景：</strong>
                                                <span style="color: #1e293b; font-size: 14px;">${item['拜访场景']}</span>
                                            </div>
                                            <div>
                                                <strong style="color: #64748b; font-size: 12px;">咨询专家：</strong>
                                                <span style="color: #1e293b; font-size: 14px;">${item['咨询专家'] || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                `;
                                contentDiv.innerHTML += taskHtml;
                            } else if (item['商机名称']) {
                                // 渲染商机卡片
                                const oppHtml = `
                                    <div style="background: #ffffff; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
                                        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px;">
                                            <h2 style="font-size: 16px; font-weight: 600; color: #1e293b; margin: 0;">${item['商机名称']}</h2>
                                        </div>
                                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 16px; margin-bottom: 16px;">
                                            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0;">
                                                <span style="color: #64748b; font-size: 13px; font-weight: 500;">商机名称</span>
                                                <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${item['商机名称']}</span>
                                            </div>
                                            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0;">
                                                <span style="color: #64748b; font-size: 13px; font-weight: 500;">商机所属BU</span>
                                                <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${item['商机所属BU']}</span>
                                            </div>
                                            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0;">
                                                <span style="color: #64748b; font-size: 13px; font-weight: 500;">商机模板</span>
                                                <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${item['商机模板']}</span>
                                            </div>
                                            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0;">
                                                <span style="color: #64748b; font-size: 13px; font-weight: 500;">商机来源</span>
                                                <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${item['商机来源']}</span>
                                            </div>
                                            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0;">
                                                <span style="color: #64748b; font-size: 13px; font-weight: 500;">客户CDBID</span>
                                                <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${item['客户CDBID']}</span>
                                            </div>
                                            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0;">
                                                <span style="color: #64748b; font-size: 13px; font-weight: 500;">产品域</span>
                                                <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${item['产品域']}</span>
                                            </div>
                                            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0;">
                                                <span style="color: #64748b; font-size: 13px; font-weight: 500;">采购模式</span>
                                                <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${item['采购模式']}</span>
                                            </div>
                                            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0;">
                                                <span style="color: #64748b; font-size: 13px; font-weight: 500;">标讯招标时间</span>
                                                <span style="color: #1e293b; font-size: 14px; font-weight: 600;">2026-04-01</span>
                                             </div>
                                              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0;">
                                                 <span style="color: #64748b; font-size: 13px; font-weight: 500;">商机金额</span>
                                                 <span style="color: #ef4444; font-size: 14px; font-weight: 600;">1200000</span>
                                              </div>
                                              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0;">
                                                 <span style="color: #64748b; font-size: 13px; font-weight: 500;">标讯ID</span>
                                                 <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${item['标讯ID']}</span>
                                               </div>
                                           </div>
                                        <div style="text-align: center; padding-top: 8px; border-top: 1px solid #e2e8f0;">
                                            <button style="background: linear-gradient(135deg, #2563eb, #0ea5e9); color: white; border: none; border-radius: 8px; padding: 12px 24px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">确认生成商机</button>
                                        </div>
                                    </div>
                                `;
                                contentDiv.innerHTML += oppHtml;
                             }
                            
                            scrollToBottom();
                            index++;
                            
                            setTimeout(showNextItem, 1000);
                        } else {
                            addSuggestions(data.suggestions, contentDiv);
                        }
                    }
                    
                    showNextItem();
                } catch (error) {
                    contentDiv.textContent = '数据解析失败';
                    addSuggestions(data.suggestions, contentDiv);
                }
            } else {
                streamResponse(data.response, contentDiv, () => {
                    addSuggestions(data.suggestions, contentDiv);
                });
            }
        });
    } catch (error) {
        removeTypingIndicator();
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai-message';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = '<img src="thinker-logo.png" width="48" height="48" style="border-radius: 50%;">';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = '抱歉，请求发生错误，请稍后重试。';
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);
        chatContainer.appendChild(messageDiv);
    }
    
    messageInput.focus();
}

sendBtn.addEventListener('click', () => {
    if (isStreaming) {
        stopStreaming();
    } else {
        sendMessage();
    }
});

document.querySelector('.new-chat-btn').addEventListener('click', () => {
    const welcomeSection = document.querySelector('.welcome-section');
    if (chatContainer.contains(welcomeSection)) {
        return;
    }
    
    chatContainer.innerHTML = `
        <div class="welcome-section">
            <div class="welcome-logo">
                <div class="welcome-icon">
                    <img src="thinker-logo.png" width="80" height="80" style="border-radius: 50%;">
                </div>
            </div>
            <h1 class="welcome-title">有什么我能帮你的吗？</h1>
            <p class="welcome-subtitle">我是您的AI销售助手，可以帮您分析客户需求、解答产品问题、生成销售方案</p>
            <div class="suggestion-grid">
                <div class="suggestion-item" onclick="sendSuggestion('帮我分析一下这个客户需求')">
                    帮我分析一下这个客户需求
                </div>
                <div class="suggestion-item" onclick="sendSuggestion('推荐产品方案')">
                    推荐产品方案
                </div>
                <div class="suggestion-item" onclick="sendSuggestion('帮我生成销售话术')">
                    帮我生成销售话术
                </div>

                <div class="suggestion-item" onclick="sendSuggestion('帮我写一封跟进邮件')">
                    帮我写一封跟进邮件
                </div>
            </div>
        </div>
    `;
});

messageInput.focus();
autoResizeTextarea();
updateSendButton();

document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('collapsed');
});

// 查看标讯详情函数
function viewBidDetail(bidTitle) {
    console.log('查看标讯详情:', bidTitle);
    
    // 获取元素
    const sidebar = document.querySelector('.sidebar');
    const appContainer = document.querySelector('.app-container');
    const mainContent = document.querySelector('.main-content');
    const inputArea = document.querySelector('.input-area');
    let sidebarWasCollapsed = false;
    
    // 保存原始样式
    const originalStyles = {
        appContainer: appContainer ? {
            display: appContainer.style.display,
            paddingLeft: appContainer.style.paddingLeft
        } : {},
        mainContent: mainContent ? {
            width: mainContent.style.width,
            right: mainContent.style.right
        } : {},
        inputArea: inputArea ? {
            position: inputArea.style.position,
            left: inputArea.style.left,
            right: inputArea.style.right,
            display: inputArea.style.display
        } : {}
    };
    
    // 收起左侧菜单
    if (sidebar) {
        sidebarWasCollapsed = sidebar.classList.contains('collapsed');
        if (!sidebarWasCollapsed) {
            sidebar.classList.add('collapsed');
        }
    }
    
    // 判断是否移动端
    const isMobile = window.innerWidth < 768;
    
    // 调整布局 - 移动端底部滑出，PC端左右分屏
    if (isMobile) {
        // 移动端：右侧面板从底部滑出，占据整个屏幕
        if (appContainer) {
            appContainer.style.overflow = 'hidden';
        }
        if (inputArea) {
            inputArea.style.display = 'none';
        }
    } else {
        // PC端：调整主内容区域，留出右侧50%空间
        if (appContainer) {
            appContainer.style.display = 'flex';
            appContainer.style.height = '100vh';
            appContainer.style.paddingLeft = '0';
        }
        if (mainContent) {
            mainContent.style.width = '50%';
            mainContent.style.flexShrink = '0';
            mainContent.style.transition = 'width 0.3s ease';
        }
        if (inputArea) {
            inputArea.style.position = 'fixed';
            inputArea.style.left = '0';
            inputArea.style.right = '50%';
        }
    }
    
    // 创建标讯详情面板 - 移动端全屏底部滑出，PC端右侧分屏
    const rightScreen = document.createElement('div');
    rightScreen.id = 'bidDetailScreen';
    if (isMobile) {
        rightScreen.style.cssText = `
            position: fixed;
            left: 0;
            bottom: 0;
            width: 100%;
            max-height: 85vh;
            background: #ffffff;
            box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            z-index: 9999;
            transform: translateY(100%);
            transition: transform 0.3s ease-out;
        `;
        // 添加动画类，触发进入动画
        setTimeout(() => {
            rightScreen.style.transform = 'translateY(0)';
        }, 10);
    } else {
        rightScreen.style.cssText = `
            position: relative;
            width: 50%;
            height: 100vh;
            background: #ffffff;
            box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            z-index: 10;
        `;
    }
    
    // 头部
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 16px 20px;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f8fafc;
    `;
    
    const headerTitle = document.createElement('h3');
    headerTitle.textContent = '标讯详情';
    headerTitle.style.cssText = `
        font-size: 18px;
        font-weight: 600;
        margin: 0;
        color: #1e293b;
    `;
    
    // 关闭按钮
    const closeButton = document.createElement('button');
    closeButton.textContent = '关闭';
    closeButton.style.cssText = `
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 6px 12px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
    `;
    closeButton.onclick = function() {
        // 恢复原始状态
        if (sidebar && !sidebarWasCollapsed) {
            sidebar.classList.remove('collapsed');
        }
        // 恢复原始样式
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            if (appContainer) {
                appContainer.style.overflow = originalStyles.appContainer.overflow || '';
            }
            if (inputArea) {
                inputArea.style.display = originalStyles.inputArea.display || '';
            }
        } else {
            if (appContainer) {
                appContainer.style.display = originalStyles.appContainer.display || '';
                appContainer.style.height = originalStyles.appContainer.height || '';
                appContainer.style.paddingLeft = originalStyles.appContainer.paddingLeft || '';
            }
            if (mainContent) {
                mainContent.style.width = originalStyles.mainContent.width || '';
                mainContent.style.flexShrink = originalStyles.mainContent.flexShrink || '';
            }
            if (inputArea) {
                inputArea.style.position = originalStyles.inputArea.position || '';
                inputArea.style.left = originalStyles.inputArea.left || '';
                inputArea.style.right = originalStyles.inputArea.right || '';
            }
        }
        // 移除右侧面板 - 移动端带关闭动画
        if (isMobile) {
            rightScreen.style.transform = 'translateY(100%)';
            setTimeout(() => {
                rightScreen.remove();
            }, 300);
        } else {
            rightScreen.remove();
        }
    };
    
    header.appendChild(headerTitle);
    header.appendChild(closeButton);
    
    // 内容区
    const contentArea = document.createElement('div');
    contentArea.style.cssText = `
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        background: #ffffff;
        overflow-x: auto;
    `;
    
    // 加载标讯内容HTML文件
    const loadingDiv = document.createElement('div');
    loadingDiv.textContent = '加载中...';
    loadingDiv.style.cssText = `
        color: #64748b;
        font-size: 16px;
    `;
    contentArea.appendChild(loadingDiv);
    
    // 标讯内容HTML已内联
     loadingDiv.remove();
     const contentDiv = document.createElement('div');
     contentDiv.innerHTML = `
         <div style="max-width: 100%;">
             <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 20px; color: #2c3e50; line-height: 1.4;">吉林省云联数创科技有限公司政务内网新型基础设施建设项目<br>2026年1月采购意向</h1>
              
             <div style="margin-bottom: 30px;">
                 <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 15px; color: #34495e; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">原公告采购信息</h3>
                 
                 <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
                     <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 16px;">
                         <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                             <span style="color: #64748b; font-size: 13px; font-weight: 500;">序号</span>
                             <span style="color: #1e293b; font-size: 14px; font-weight: 600;">1</span>
                         </div>
                         <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                             <span style="color: #64748b; font-size: 13px; font-weight: 500;">采购项目名称</span>
                             <span style="color: #1e293b; font-size: 14px; font-weight: 600;">政务内网新型基础设施建设项目</span>
                         </div>
                         <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                             <span style="color: #64748b; font-size: 13px; font-weight: 500;">预算金额</span>
                             <span style="color: #ef4444; font-size: 14px; font-weight: 600;">1,300,000.00 元</span>
                         </div>
                         <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                             <span style="color: #64748b; font-size: 13px; font-weight: 500;">预计采购时间</span>
                             <span style="color: #1e293b; font-size: 14px; font-weight: 600;">2026年1月</span>
                         </div>
                     </div>
                     <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e2e8f0;">
                         <span style="color: #64748b; font-size: 13px; font-weight: 500;">采购需求概况：</span>
                         <p style="margin: 6px 0 0 0; color: #1e293b; font-size: 14px; line-height: 1.6;">采购政务内网新型基础设施相关软硬件设备及技术服务，包括服务器、前置机等平台配套所需设备及安装、布线、调试、割接服务</p>
                     </div>
                 </div>
             </div>

             <div style="margin-bottom: 30px;">
                 <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 15px; color: #34495e; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">采购单位联系方式</h3>
                 
                 <div style="background-color: #f8fafc; padding: 18px; border-radius: 6px; border: 1px solid #e2e8f0;">
                     <div style="margin-bottom: 10px;">
                         <span style="font-weight: 600; color: #475569;">采购单位：</span>
                         <span style="color: #475569;">吉林省云联数创科技有限公司</span>
                     </div>
                     <div style="margin-bottom: 10px;">
                         <span style="font-weight: 600; color: #475569;">采购单位地址：</span>
                         <span style="color: #475569;">白山市浑江区北安大街1808号浑江区高新科技孵化基地2号楼4层422号</span>
                     </div>
                     <div style="margin-bottom: 10px;">
                         <span style="font-weight: 600; color: #475569;">采购单位联系方式：</span>
                         <span style="color: #475569;">夏经理，17614393333</span>
                     </div>
                 </div>
             </div>
              
             <div style="margin-bottom: 30px;">
                 <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 20px; color: #2c3e50; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">吉林省云联数创科技有限公司分析</h2>
                 
                 <div style="margin-bottom: 25px;">
                     <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px; color: #34495e;">一、客户基本信息</h3>
                     <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; border: 1px solid #e2e8f0;">
                         <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
                             <div style="color: #475569;"><span style="font-weight: 600;">公司全称：</span>吉林省云联数创科技有限公司</div>
                             <div style="color: #475569;"><span style="font-weight: 600;">成立时间：</span>2022 年 6 月 27 日</div>
                             <div style="color: #475569;"><span style="font-weight: 600;">企业性质：</span>国有控股（白山市国资委 51%、中国联通 49%）</div>
                             <div style="color: #475569;"><span style="font-weight: 600;">注册资本：</span>500 万元</div>
                             <div style="color: #475569;"><span style="font-weight: 600;">注册地址：</span>白山市浑江区北安大街 1808 号浑江区高新科技孵化基地 2 号楼 4 层 422 号</div>
                             <div style="color: #475569;"><span style="font-weight: 600;">核心业务：</span>信息系统集成、云计算、大数据、网络安全、数字政府与智慧城市建设</div>
                             <div style="color: #475569;"><span style="font-weight: 600;">联系人：</span>夏经理（17614393333）</div>
                         </div>
                     </div>
                 </div>
                 
                 <div style="margin-bottom: 25px;">
                     <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px; color: #34495e;">二、基于财报的经营分析（2022-2024）</h3>
                     <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
                         <div style="margin-bottom: 16px;">
                             <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                                 <span style="color: #64748b; font-size: 13px; font-weight: 500;">年营收规模</span>
                                 <span style="color: #2563eb; font-size: 14px; font-weight: 600;">~2000 万元</span>
                             </div>
                             <div style="height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden;">
                                 <div style="width: 80%; height: 100%; background: linear-gradient(90deg, #2563eb, #3b82f6);"></div>
                             </div>
                         </div>
                         <div style="margin-bottom: 16px;">
                             <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                                 <span style="color: #64748b; font-size: 13px; font-weight: 500;">毛利率</span>
                                 <span style="color: #10b981; font-size: 14px; font-weight: 600;">35%-45%</span>
                             </div>
                             <div style="height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden;">
                                 <div style="width: 40%; height: 100%; background: linear-gradient(90deg, #10b981, #34d399);"></div>
                             </div>
                         </div>
                         <div style="margin-bottom: 16px;">
                             <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                                 <span style="color: #64748b; font-size: 13px; font-weight: 500;">净利润率</span>
                                 <span style="color: #f59e0b; font-size: 14px; font-weight: 600;">10%-15%</span>
                             </div>
                             <div style="height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden;">
                                 <div style="width: 15%; height: 100%; background: linear-gradient(90deg, #f59e0b, #fbbf24);"></div>
                             </div>
                         </div>
                         <div style="margin-bottom: 16px;">
                             <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                                 <span style="color: #64748b; font-size: 13px; font-weight: 500;">资本实力</span>
                                 <span style="color: #8b5cf6; font-size: 14px; font-weight: 600;">强</span>
                             </div>
                             <div style="height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden;">
                                 <div style="width: 90%; height: 100%; background: linear-gradient(90deg, #8b5cf6, #a78bfa);"></div>
                             </div>
                         </div>
                         <div style="padding-top: 8px; border-top: 1px dashed #e2e8f0;">
                             <p style="margin: 0; color: #475569; font-size: 14px;">
                                 <span style="font-weight: 600;">经营趋势：</span>聚焦政务云、数字基础设施、网络安全三大赛道，2026 年重点发力政务内网新型基础设施建设，持续扩大政企市场份额。
                             </p>
                         </div>
                     </div>
                 </div>
                 
                 <!-- 历史合作 -->
                 <div style="margin-bottom: 25px;">
                     <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px; color: #34495e;">
                         <span style="margin-right: 6px;">📈</span>三、历史合作
                     </h3>
                     <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
                         <div style="margin-bottom: 16px;">
                             <div style="width: 100%; height: 300px; background: #f8fafc; border-radius: 8px; padding: 16px;">
                                 <canvas id="cooperationChartBid" width="400" height="300"></canvas>
                             </div>
                         </div>
                         <div style="overflow-x: auto;">
                             <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                 <thead>
                                     <tr style="background: #f1f5f9; text-align: left;">
                                         <th style="padding: 8px; border-bottom: 1px solid #e2e8f0;">BU</th>
                                         <th style="padding: 8px; border-bottom: 1px solid #e2e8f0;">FY2023(万元)</th>
                                         <th style="padding: 8px; border-bottom: 1px solid #e2e8f0;">FY2024(万元)</th>
                                         <th style="padding: 8px; border-bottom: 1px solid #e2e8f0;">FY2025(万元)</th>
                                     </tr>
                                 </thead>
                                 <tbody>
                                     <tr style="border-bottom: 1px solid #e2e8f0;">
                                         <td style="padding: 8px;">REL</td>
                                         <td style="padding: 8px;">10000</td>
                                         <td style="padding: 8px;">12000</td>
                                         <td style="padding: 8px;">12500</td>
                                     </tr>
                                     <tr style="border-bottom: 1px solid #e2e8f0;">
                                         <td style="padding: 8px;">ISG</td>
                                         <td style="padding: 8px;">2000</td>
                                         <td style="padding: 8px;">4500</td>
                                         <td style="padding: 8px;">6000</td>
                                     </tr>
                                     <tr style="border-bottom: 1px solid #e2e8f0;">
                                         <td style="padding: 8px;">SSG</td>
                                         <td style="padding: 8px;">1500</td>
                                         <td style="padding: 8px;">2000</td>
                                         <td style="padding: 8px;">4000</td>
                                     </tr>
                                     <tr style="background: #f1f5f9;">
                                         <td style="padding: 8px; font-weight: 600;">总计</td>
                                         <td style="padding: 8px; font-weight: 600;">13500</td>
                                         <td style="padding: 8px; font-weight: 600;">18500</td>
                                         <td style="padding: 8px; font-weight: 600;">22500</td>
                                     </tr>
                                 </tbody>
                             </table>
                         </div>
                     </div>
                 </div>
                 
                 </div>
                 
                 <div style="margin-bottom: 25px;">
                     <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px; color: #34495e;">五、历史标讯（近 3 年）</h3>
                     <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; border: 1px solid #e2e8f0;">
                         <ul style="margin: 0; padding-left: 20px; color: #475569;">
                             <li style="margin-bottom: 8px;">2024 年 7 月：靖宇县基层治理云平台，179.8 万元</li>
                             <li style="margin-bottom: 8px;">2025 年 12 月：数字基础设施服务器及网络设备采购，20.7 万元</li>
                         </ul>
                     </div>
                 </div>
                 
                 <div style="margin-bottom: 25px;">
                     <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px; color: #34495e;">六、产品推荐（政务内网场景）</h3>
                     
                     <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
                         <div style="background: linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%); padding: 16px; border-radius: 8px; border-left: 4px solid #2563eb; border: 1px solid #e2e8f0;">
                             <div style="display: flex; align-items: center; margin-bottom: 8px;">
                                 <span style="font-size: 20px; margin-right: 8px;">🖥️</span>
                                 <h4 style="font-size: 15px; font-weight: 600; margin: 0; color: #1e40af;">1. 服务器（核心）</h4>
                             </div>
                             <p style="margin: 0 0 6px; color: #475569;"><span style="font-weight: 600;">推荐型号：</span>联想 ThinkSystem SR650 V3</p>
                             <p style="margin: 0; color: #475569;"><span style="font-weight: 600;">优势：</span>国产信创兼容、高可靠、高算力</p>
                         </div>
                         <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%); padding: 16px; border-radius: 8px; border-left: 4px solid #10b981; border: 1px solid #e2e8f0;">
                             <div style="display: flex; align-items: center; margin-bottom: 8px;">
                                 <span style="font-size: 20px; margin-right: 8px;">🔌</span>
                                 <h4 style="font-size: 15px; font-weight: 600; margin: 0; color: #065f46;">2. 前置机（政务网关）</h4>
                             </div>
                             <p style="margin: 0 0 6px; color: #475569;"><span style="font-weight: 600;">推荐型号：</span>联想 ThinkSystem SR250 V3</p>
                             <p style="margin: 0; color: #475569;"><span style="font-weight: 600;">优势：</span>轻量化、高安全、强隔离</p>
                         </div>
                         <div style="background: linear-gradient(135deg, #fef3c7 0%, #ffffff 100%); padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; border: 1px solid #e2e8f0;">
                             <div style="display: flex; align-items: center; margin-bottom: 8px;">
                                 <span style="font-size: 20px; margin-right: 8px;">🌐</span>
                                 <h4 style="font-size: 15px; font-weight: 600; margin: 0; color: #92400e;">3. 网络设备</h4>
                             </div>
                             <p style="margin: 0 0 6px; color: #475569;"><span style="font-weight: 600;">推荐型号：</span>联想 G7000 系列交换机</p>
                             <p style="margin: 0; color: #475569;"><span style="font-weight: 600;">优势：</span>国产信创、高安全、高带宽</p>
                         </div>
                     </div>
                 </div>
             </div>
         </div>
     `;
     contentDiv.style.cssText = `
         font-size: 16px;
         line-height: 1.8;
         color: #1e293b;
         max-width: 100%;
         padding: 20px;
         box-sizing: border-box;
     `;
     contentArea.appendChild(contentDiv);
     
     // 初始化历史合作数据图表
     setTimeout(() => {
         const ctx = document.getElementById('cooperationChartBid');
         if (ctx) {
             const chartCtx = ctx.getContext('2d');
             const cooperationChart = new Chart(chartCtx, {
                 type: 'bar',
                 data: {
                     labels: ['FY2023', 'FY2024', 'FY2025'],
                     datasets: [
                         {
                             label: 'REL',
                             data: [10000, 12000, 12500],
                             backgroundColor: 'rgba(37, 99, 235, 0.7)',
                             borderColor: 'rgba(37, 99, 235, 1)',
                             borderWidth: 1
                         },
                         {
                             label: 'ISG',
                             data: [2000, 4500, 6000],
                             backgroundColor: 'rgba(16, 185, 129, 0.7)',
                             borderColor: 'rgba(16, 185, 129, 1)',
                             borderWidth: 1
                         },
                         {
                             label: 'SSG',
                             data: [1500, 2000, 4000],
                             backgroundColor: 'rgba(245, 158, 11, 0.7)',
                             borderColor: 'rgba(245, 158, 11, 1)',
                             borderWidth: 1
                         }
                     ]
                 },
                 options: {
                     responsive: true,
                     maintainAspectRatio: false,
                     scales: {
                         y: {
                             beginAtZero: true,
                             title: {
                                 display: true,
                                 text: '金额 (万元)'
                             }
                         }
                     },
                     plugins: {
                         title: {
                             display: true,
                             text: '历史合作金额趋势',
                             font: {
                                 size: 14
                             }
                         },
                         legend: {
                             position: 'top'
                         }
                     }
                 }
             });
         }
     }, 100);
     
     console.log('标讯内容加载成功');
    
    // 组装右侧分屏
    rightScreen.appendChild(header);
    rightScreen.appendChild(contentArea);
    
    // 添加右侧面板到app容器
    if (appContainer) {
        appContainer.appendChild(rightScreen);
    }
    
    console.log('标讯详情面板已添加');
}

// 查看客户分析函数
// 客户分析数据在customerAnalysis.js中定义

function viewCustomerAnalysis(customerName) {
    console.log('查看客户分析:', customerName);
    
    // 获取元素
    const sidebar = document.querySelector('.sidebar');
    const appContainer = document.querySelector('.app-container');
    const mainContent = document.querySelector('.main-content');
    const inputArea = document.querySelector('.input-area');
    let sidebarWasCollapsed = false;
    
    // 保存原始样式
    const originalStyles = {
        appContainer: appContainer ? {
            display: appContainer.style.display,
            paddingLeft: appContainer.style.paddingLeft
        } : {},
        mainContent: mainContent ? {
            width: mainContent.style.width,
            right: mainContent.style.right
        } : {},
        inputArea: inputArea ? {
            position: inputArea.style.position,
            left: inputArea.style.left,
            right: inputArea.style.right,
            display: inputArea.style.display
        } : {}
    };
    
    // 收起左侧菜单
    if (sidebar) {
        sidebarWasCollapsed = sidebar.classList.contains('collapsed');
        if (!sidebarWasCollapsed) {
            sidebar.classList.add('collapsed');
        }
    }
    
    // 判断是否移动端
    const isMobile = window.innerWidth < 768;
    
    // 调整布局 - 移动端底部滑出，PC端左右分屏
    if (isMobile) {
        // 移动端：右侧面板从底部滑出，占据整个屏幕
        if (appContainer) {
            appContainer.style.overflow = 'hidden';
        }
        if (inputArea) {
            inputArea.style.display = 'none';
        }
    } else {
        // PC端：调整主内容区域，留出右侧50%空间
        if (appContainer) {
            appContainer.style.display = 'flex';
            appContainer.style.height = '100vh';
            appContainer.style.paddingLeft = '0';
        }
        if (mainContent) {
            mainContent.style.width = '50%';
            mainContent.style.flexShrink = '0';
            mainContent.style.transition = 'width 0.3s ease';
        }
        if (inputArea) {
            inputArea.style.position = 'fixed';
            inputArea.style.left = '0';
            inputArea.style.right = '50%';
        }
    }
    
    // 创建客户分析面板 - 移动端全屏底部滑出，PC端右侧分屏
    const rightScreen = document.createElement('div');
    rightScreen.id = 'customerAnalysisScreen';
    if (isMobile) {
        rightScreen.style.cssText = `
            position: fixed;
            left: 0;
            bottom: 0;
            width: 100%;
            max-height: 85vh;
            background: #ffffff;
            box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            z-index: 9999;
            transform: translateY(100%);
            transition: transform 0.3s ease-out;
        `;
        setTimeout(() => {
            rightScreen.style.transform = 'translateY(0)';
        }, 10);
    } else {
        rightScreen.style.cssText = `
            position: relative;
            width: 50%;
            height: 100vh;
            background: #ffffff;
            box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            z-index: 10;
        `;
    }
    
    // 头部
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 16px 20px;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f8fafc;
    `;
    
    const headerTitle = document.createElement('h3');
    headerTitle.textContent = '客户分析';
    headerTitle.style.cssText = `
        font-size: 18px;
        font-weight: 600;
        margin: 0;
        color: #1e293b;
    `;
    
    // 关闭按钮
    const closeButton = document.createElement('button');
    closeButton.textContent = '关闭';
    closeButton.style.cssText = `
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 6px 12px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
    `;
    closeButton.onclick = function() {
        // 恢复原始状态
        if (sidebar && !sidebarWasCollapsed) {
            sidebar.classList.remove('collapsed');
        }
        // 恢复原始样式
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            if (appContainer) {
                appContainer.style.overflow = originalStyles.appContainer.overflow || '';
            }
            if (inputArea) {
                inputArea.style.display = originalStyles.inputArea.display || '';
            }
        } else {
            if (appContainer) {
                appContainer.style.display = originalStyles.appContainer.display || '';
                appContainer.style.height = originalStyles.appContainer.height || '';
                appContainer.style.paddingLeft = originalStyles.appContainer.paddingLeft || '';
            }
            if (mainContent) {
                mainContent.style.width = originalStyles.mainContent.width || '';
                mainContent.style.flexShrink = originalStyles.mainContent.flexShrink || '';
            }
            if (inputArea) {
                inputArea.style.position = originalStyles.inputArea.position || '';
                inputArea.style.left = originalStyles.inputArea.left || '';
                inputArea.style.right = originalStyles.inputArea.right || '';
            }
        }
        // 移除右侧面板 - 移动端带关闭动画
        if (isMobile) {
            rightScreen.style.transform = 'translateY(100%)';
            setTimeout(() => {
                rightScreen.remove();
            }, 300);
        } else {
            rightScreen.remove();
        }
    };
    
    header.appendChild(headerTitle);
    header.appendChild(closeButton);
    
    // 内容区
    const contentArea = document.createElement('div');
    contentArea.style.cssText = `
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        background: #ffffff;
        overflow-x: auto;
    `;
    
    // 获取客户分析数据
    const customerData = window.customerAnalysisData && window.customerAnalysisData[customerName];
    if (customerData) {
        const contentDiv = document.createElement('div');
        
        // 计算IT Spending 饼图数据
        const externalIT = parseInt(customerData['对外IT Spending(M$)']) || 0;
        const internalIT = parseInt(customerData['对内IT Spending(M$)']) || 0;
        const totalIT = externalIT + internalIT;
        
        // 计算SOW饼图数据
        const pcSow = parseInt(customerData['PC SOW%']) || 0;
        const storageSow = parseInt(customerData['存储 SOW%']) || 0;
        const serverSow = parseInt(customerData['服务器SOW%']) || 0;
        
        const externalPercent = totalIT > 0 ? Math.round((externalIT / totalIT) * 100) : 0;
        const internalPercent = totalIT > 0 ? Math.round((internalIT / totalIT) * 100) : 0;
        
        let contentHtml = `
            <div style="max-width: 100%;">
                <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 20px; color: #2c3e50; line-height: 1.4;">${customerName} 客户分析（根据Account Plan数据）</h1>
                
                <!-- 基础信息卡片 -->
                <div style="margin-bottom: 24px;">
                    <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px; color: #34495e;">
                        <span style="margin-right: 6px;">📋</span>基础信息
                    </h3>
                    <div style="background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 16px;">
                            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0;">
                                <span style="color: #64748b; font-size: 13px; font-weight: 500;">客户编号</span>
                                <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${customerData['客户编号'] || '-'}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0;">
                                <span style="color: #64748b; font-size: 13px; font-weight: 500;">战区/纵队</span>
                                <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${customerData['战区']} / ${customerData['纵队']}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0;">
                                <span style="color: #64748b; font-size: 13px; font-weight: 500;">行业经理</span>
                                <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${customerData['行业经理Name']} (${customerData['行业经理ID']})</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0;">
                                <span style="color: #64748b; font-size: 13px; font-weight: 500;">管理子行业</span>
                                <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${customerData['管理子行业']}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- IT信息化战略 -->
                <div style="margin-bottom: 24px;">
                    <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px; color: #34495e;">
                        <span style="margin-right: 6px;">🎯</span>IT信息化战略方向
                    </h3>
                    <div style="background: #f0f9ff; padding: 14px 16px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                        <p style="margin: 0; color: #1e293b; font-size: 14px; line-height: 1.6;">${customerData['IT信息化战略方向']}</p>
                    </div>
                </div>
                
                <!-- IT Spending 饼图 -->
                <div style="margin-bottom: 24px;">
                    <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px; color: #34495e;">
                        <span style="margin-right: 6px;">💰</span>IT Spending 分布 (单位: 百万美元)
                    </h3>
                    <div style="background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <div style="display: flex; flex-wrap: wrap; gap: 32px; align-items: center;">
                            <!-- 饼图 -->
                            <div style="flex: 1; min-width: 200px;">
                                <div style="width: 200px; height: 200px; margin: 0 auto; position: relative;">
                                    <svg width="200" height="200" viewBox="0 0 200 200">
                                        <circle cx="100" cy="100" r="80" fill="#e2e8f0" />
                                        ${externalPercent > 0 ? `<circle cx="100" cy="100" r="80" fill="none" stroke="#2563eb" stroke-width="20" stroke-dasharray="${2 * Math.PI * 80 * externalPercent / 100} ${2 * Math.PI * 80 * (100 - externalPercent) / 100}" stroke-linecap="round" transform="rotate(-90 100 100)" />` : ''}
                                        ${internalPercent > 0 ? `<circle cx="100" cy="100" r="80" fill="none" stroke="#10b981" stroke-width="20" stroke-dasharray="${2 * Math.PI * 80 * internalPercent / 100} ${2 * Math.PI * 80 * (100 - internalPercent) / 100}" stroke-linecap="round" transform="rotate(${270 + (externalPercent * 3.6)} 100 100)" />` : ''}
                                        <text x="100" y="95" text-anchor="middle" fill="#1e293b" font-size="18" font-weight="600">${totalIT}</text>
                                        <text x="100" y="115" text-anchor="middle" fill="#64748b" font-size="12">M$</text>
                                    </svg>
                                </div>
                            </div>
                            
                            <!-- 图例和数据 -->
                            <div style="flex: 1; min-width: 200px;">
                                <div style="margin-bottom: 16px;">
                                    <div style="display: flex; align-items: center; margin-bottom: 12px;">
                                        <div style="width: 16px; height: 16px; background: #2563eb; border-radius: 4px; margin-right: 8px;"></div>
                                        <div style="flex: 1;">
                                            <div style="display: flex; justify-content: space-between;">
                                                <span style="font-size: 14px; color: #64748b; font-weight: 500;">对外IT Spending</span>
                                                <span style="font-size: 14px; color: #2563eb; font-weight: 600;">${externalIT}M$ (${externalPercent}%)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style="display: flex; align-items: center;">
                                        <div style="width: 16px; height: 16px; background: #10b981; border-radius: 4px; margin-right: 8px;"></div>
                                        <div style="flex: 1;">
                                            <div style="display: flex; justify-content: space-between;">
                                                <span style="font-size: 14px; color: #64748b; font-weight: 500;">对内IT Spending</span>
                                                <span style="font-size: 14px; color: #10b981; font-weight: 600;">${internalIT}M$ (${internalPercent}%)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- 联想可参与份额 -->
                                <div style="padding-top: 16px; border-top: 1px solid #e2e8f0;">
                                    <h4 style="font-size: 14px; font-weight: 600; margin: 0 0 12px; color: #34495e;">联想可参与份额</h4>
                                    <div style="margin-bottom: 16px;">
                                        <div style="padding: 12px; background: #eff6ff; border-radius: 6px; border-left: 4px solid #2563eb;">
                                            <div style="font-size: 12px; color: #64748b; font-weight: 500; margin-bottom: 4px;">对外IT Spending</div>
                                            <div style="font-size: 18px; font-weight: 700; color: #2563eb;">${customerData['对外IT Spending(M$)'] || 0}M$</div>
                                        </div>
                                    </div>
                                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                                        <div style="text-align: center; padding: 10px; background: #f0fdf4; border-radius: 6px;">
                                            <div style="font-size: 11px; color: #64748b; font-weight: 500; margin-bottom: 4px;">桌面级硬件</div>
                                            <div style="font-size: 16px; font-weight: 700; color: #10b981;">${customerData['桌面级硬件-可参与'] || 0}M$</div>
                                        </div>
                                        <div style="text-align: center; padding: 10px; background: #eff6ff; border-radius: 6px;">
                                            <div style="font-size: 11px; color: #64748b; font-weight: 500; margin-bottom: 4px;">企业级硬件</div>
                                            <div style="font-size: 16px; font-weight: 700; color: #2563eb;">${customerData['企业级硬件-可参与'] || 0}M$</div>
                                        </div>
                                        <div style="text-align: center; padding: 10px; background: #fef3c7; border-radius: 6px;">
                                            <div style="font-size: 11px; color: #64748b; font-weight: 500; margin-bottom: 4px;">软件及服务</div>
                                            <div style="font-size: 16px; font-weight: 700; color: #f59e0b;">${customerData['软件及服务-可参与'] || 0}M$</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 产品可参与度分布 -->
                <div style="margin-bottom: 24px;">
                    <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px; color: #34495e;">
                        <span style="margin-right: 6px;">📊</span>产品可参与度 (%)
                    </h3>
                    <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                            <div style="text-align: center; padding: 12px; background: #f0fdf4; border-radius: 6px;">
                                <div style="font-size: 12px; color: #64748b; font-weight: 500; margin-bottom: 4px;">桌面级硬件</div>
                                <div style="font-size: 20px; font-weight: 700; color: #10b981;">${customerData['桌面级硬件-可参与'] || 0}</div>
                            </div>
                            <div style="text-align: center; padding: 12px; background: #eff6ff; border-radius: 6px;">
                                <div style="font-size: 12px; color: #64748b; font-weight: 500; margin-bottom: 4px;">企业级硬件</div>
                                <div style="font-size: 20px; font-weight: 700; color: #2563eb;">${customerData['企业级硬件-可参与'] || 0}</div>
                            </div>
                            <div style="text-align: center; padding: 12px; background: #fef3c7; border-radius: 6px;">
                                <div style="font-size: 12px; color: #64748b; font-weight: 500; margin-bottom: 4px;">软件及服务</div>
                                <div style="font-size: 20px; font-weight: 700; color: #f59e0b;">${customerData['软件及服务-可参与'] || 0}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- SOW 占比 -->
                <div style="margin-bottom: 24px;">
                    <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px; color: #34495e;">
                        <span style="margin-right: 6px;">🎯</span>SOW 产品占比 (%)
                    </h3>
                    <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <div style="margin-bottom: 16px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                                <span style="font-size: 13px; color: #64748b; font-weight: 500;">PC</span>
                                <span style="font-size: 14px; color: #8b5cf6; font-weight: 600;">${pcSow}%</span>
                            </div>
                            <div style="height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden;">
                                <div style="width: ${pcSow}%; height: 100%; background: linear-gradient(90deg, #8b5cf6, #a78bfa);"></div>
                            </div>
                        </div>
                        <div style="margin-bottom: 16px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                                <span style="font-size: 13px; color: #64748b; font-weight: 500;">存储</span>
                                <span style="font-size: 14px; color: #ec4899; font-weight: 600;">${storageSow}%</span>
                            </div>
                            <div style="height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden;">
                                <div style="width: ${storageSow}%; height: 100%; background: linear-gradient(90deg, #ec4899, #f472b6);"></div>
                            </div>
                        </div>
                        <div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                                <span style="font-size: 13px; color: #64748b; font-weight: 500;">服务器</span>
                                <span style="font-size: 14px; color: #f97316; font-weight: 600;">${serverSow}%</span>
                            </div>
                            <div style="height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden;">
                                <div style="width: ${serverSow}%; height: 100%; background: linear-gradient(90deg, #f97316, #fdba74);"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 历史合作 -->
                <div style="margin-bottom: 24px;">
                    <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px; color: #34495e;">
                        <span style="margin-right: 6px;">📈</span>历史合作
                    </h3>
                    <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <div style="margin-bottom: 16px;">
                            <div style="width: 100%; height: 300px; background: #f8fafc; border-radius: 8px; padding: 16px;">
                                <canvas id="cooperationChart" width="400" height="300"></canvas>
                            </div>
                        </div>
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                <thead>
                                    <tr style="background: #f1f5f9; text-align: left;">
                                        <th style="padding: 8px; border-bottom: 1px solid #e2e8f0;">BU</th>
                                        <th style="padding: 8px; border-bottom: 1px solid #e2e8f0;">FY2023(万元)</th>
                                        <th style="padding: 8px; border-bottom: 1px solid #e2e8f0;">FY2024(万元)</th>
                                        <th style="padding: 8px; border-bottom: 1px solid #e2e8f0;">FY2025(万元)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style="border-bottom: 1px solid #e2e8f0;">
                                        <td style="padding: 8px;">REL</td>
                                        <td style="padding: 8px;">10000</td>
                                        <td style="padding: 8px;">12000</td>
                                        <td style="padding: 8px;">12500</td>
                                    </tr>
                                    <tr style="border-bottom: 1px solid #e2e8f0;">
                                        <td style="padding: 8px;">ISG</td>
                                        <td style="padding: 8px;">2000</td>
                                        <td style="padding: 8px;">4500</td>
                                        <td style="padding: 8px;">6000</td>
                                    </tr>
                                    <tr style="border-bottom: 1px solid #e2e8f0;">
                                        <td style="padding: 8px;">SSG</td>
                                        <td style="padding: 8px;">1500</td>
                                        <td style="padding: 8px;">2000</td>
                                        <td style="padding: 8px;">4000</td>
                                    </tr>
                                    <tr style="background: #f1f5f9;">
                                        <td style="padding: 8px; font-weight: 600;">总计</td>
                                        <td style="padding: 8px; font-weight: 600;">13500</td>
                                        <td style="padding: 8px; font-weight: 600;">18500</td>
                                        <td style="padding: 8px; font-weight: 600;">22500</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <!-- 竞争分析 -->
                <div style="margin-bottom: 24px;">
                    <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px; color: #34495e;">
                        <span style="margin-right: 6px;">🆚</span>竞争分析
                    </h3>
                    <div style="background: #fff7ed; padding: 14px 16px; border-radius: 8px; border: 1px solid #fed7aa;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                            <div>
                                <span style="font-size: 13px; color: #c2410c; font-weight: 600;">桌面级硬件</span><br>
                                <span style="font-size: 14px; color: #1e293b;">使用现状：${customerData['桌面级硬件-使用现状'] || '-'}</span><br>
                                <span style="font-size: 14px; color: #1e293b;">竞争对手：${customerData['桌面级硬件-主要竞争对手'] || '-'}</span>
                            </div>
                            <div>
                                <span style="font-size: 13px; color: #c2410c; font-weight: 600;">企业级硬件</span><br>
                                <span style="font-size: 14px; color: #1e293b;">使用现状：${customerData['企业级硬件-使用现状'] || '-'}</span><br>
                                <span style="font-size: 14px; color: #1e293b;">竞争对手：${customerData['企业级硬件-主要竞争对手'] || '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 渠道分析 -->
                <div style="margin-bottom: 24px;">
                    <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px; color: #34495e;">
                        <span style="margin-right: 6px;">🚚</span>渠道分析
                    </h3>
                    <div style="background: #f0fdfa; padding: 14px 16px; border-radius: 8px; border: 1px solid #5eead4;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
                            <div>
                                <span style="font-size: 13px; color: #0f766e; font-weight: 600;">渠道名称</span><br>
                                <span style="font-size: 14px; color: #1e293b;">${customerData['渠道名称1'] || '-'}</span>
                            </div>
                            <div>
                                <span style="font-size: 13px; color: #0f766e; font-weight: 600;">合作产品</span><br>
                                <span style="font-size: 14px; color: #1e293b;">${customerData['合作/出货产品1'] || '-'}</span>
                            </div>
                            <div>
                                <span style="font-size: 13px; color: #0f766e; font-weight: 600;">合作品牌</span><br>
                                <span style="font-size: 14px; color: #1e293b;">${customerData['主营合作品牌1'] || '-'}</span>
                            </div>
                            <div>
                                <span style="font-size: 13px; color: #0f766e; font-weight: 600;">渠道份额</span><br>
                                <span style="font-size: 14px; color: #1e293b; font-weight: 600;">${customerData['渠道份额%1'] || '-'}%</span>
                            </div>
                            <div>
                                <span style="font-size: 13px; color: #0f766e; font-weight: 600;">选型影响力</span><br>
                                <span style="font-size: 14px; color: #1e293b;">${customerData['渠道选型影响力1'] || '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 商业机会 -->
                <div style="margin-bottom: 24px;">
                    <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px; color: #34495e;">
                        <span style="margin-right: 6px;">💎</span>商业机会
                    </h3>
                    <div style="background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%); padding: 16px; border-radius: 8px; border: 1px solid #93c5fd;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                            <div>
                                <span style="font-size: 13px; color: #1e40af; font-weight: 600;">应用场景</span><br>
                                <span style="font-size: 14px; color: #1e293b;">${customerData['应用场景1'] || '-'}</span>
                            </div>
                            <div>
                                <span style="font-size: 13px; color: #1e40af; font-weight: 600;">核心痛点</span><br>
                                <span style="font-size: 14px; color: #1e293b;">${customerData['核心痛点及需求1'] || '-'}</span>
                            </div>
                            <div>
                                <span style="font-size: 13px; color: #1e40af; font-weight: 600;">联想可参与</span><br>
                                <span style="font-size: 14px; color: #1e293b; font-weight: 600;">${customerData['是否能有联想产品'] || '-'}</span>
                            </div>
                            <div>
                                <span style="font-size: 13px; color: #1e40af; font-weight: 600;">预计金额</span><br>
                                <span style="font-size: 14px; color: #1e293b; font-weight: 700;">${customerData['预计联想可参与金额（$M）'] || '-'}M$</span>
                            </div>
                        </div>
                        <hr style="margin: 12px 0; border: none; border-top: 1px solid #93c5fd;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
                            <div>
                                <span style="font-size: 13px; color: #1e40af; font-weight: 600;">项目名称</span><br>
                                <span style="font-size: 14px; color: #1e293b;">${customerData['项目名称1'] || '-'}</span>
                            </div>
                            <div>
                                <span style="font-size: 13px; color: #1e40af; font-weight: 600;">预算金额</span><br>
                                <span style="font-size: 14px; color: #1e293b; font-weight: 700;">${customerData['预算金额（$M）'] || '-'}M$</span>
                            </div>
                            <div>
                                <span style="font-size: 13px; color: #1e40af; font-weight: 600;">涉及产品</span><br>
                                <span style="font-size: 14px; color: #1e293b;">${customerData['涉及的PCSD产品'] || '-'} ${customerData['涉及的ISG产品'] || ''} ${customerData['涉及的SSG产品'] || ''}</span>
                            </div>
                        </div>
                        ${customerData['产品和服务要求'] ? `
                        <hr style="margin: 12px 0; border: none; border-top: 1px solid #93c5fd;">
                        <div>
                            <span style="font-size: 13px; color: #1e40af; font-weight: 600;">产品和服务要求：</span><br>
                            <span style="font-size: 14px; color: #1e293b;">${customerData['产品和服务要求']}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Offering 推荐 -->
                <div style="margin-bottom: 24px;">
                    <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 12px; color: #34495e;">
                        <span style="margin-right: 6px;">🚀</span>Offering 推荐
                    </h3>
                    <div style="background: linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%); padding: 16px; border-radius: 8px; border: 1px solid #2563eb;">
                        <div style="display: flex; flex-direction: column; gap: 16px;">
                            <div style="padding: 12px; background: #ffffff; border-radius: 6px; border-left: 4px solid #2563eb;">
                                <div style="font-size: 14px; font-weight: 700; color: #2563eb; margin-bottom: 4px;">联想 xCloud 智能云多云管理 & FinOps 方案</div>
                                <div style="font-size: 14px; color: #1e293b; line-height: 1.5;">统一纳管混合多云资源，实现资源全生命周期管理、FinOps 成本优化与安全合规，助力企业降本增效、灵活管云。</div>
                            </div>
                            <div style="padding: 12px; background: #ffffff; border-radius: 6px; border-left: 4px solid #10b981;">
                                <div style="font-size: 14px; font-weight: 700; color: #10b981; margin-bottom: 4px;">联想 IT 运营智能体（智小星）方案</div>
                                <div style="font-size: 14px; color: #1e293b; line-height: 1.5;">基于生成式 AI 打造，集成运维知识与工具，提供智能诊断、自动化执行、数据洞察能力，提升 IT 运维与故障处置效率。</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        contentDiv.innerHTML = contentHtml;
        contentDiv.style.cssText = `
            font-size: 16px;
            line-height: 1.6;
            color: #1e293b;
            max-width: 100%;
            box-sizing: border-box;
        `;
        contentArea.appendChild(contentDiv);
        
        // 初始化历史合作数据图表
        setTimeout(() => {
            const ctx = document.getElementById('cooperationChart');
            if (ctx) {
                const chartCtx = ctx.getContext('2d');
                const cooperationChart = new Chart(chartCtx, {
                    type: 'bar',
                    data: {
                        labels: ['FY2023', 'FY2024', 'FY2025'],
                        datasets: [
                            {
                                label: 'REL',
                                data: [10000, 12000, 12500],
                                backgroundColor: 'rgba(37, 99, 235, 0.7)',
                                borderColor: 'rgba(37, 99, 235, 1)',
                                borderWidth: 1
                            },
                            {
                                label: 'ISG',
                                data: [2000, 4500, 6000],
                                backgroundColor: 'rgba(16, 185, 129, 0.7)',
                                borderColor: 'rgba(16, 185, 129, 1)',
                                borderWidth: 1
                            },
                            {
                                label: 'SSG',
                                data: [1500, 2000, 4000],
                                backgroundColor: 'rgba(245, 158, 11, 0.7)',
                                borderColor: 'rgba(245, 158, 11, 1)',
                                borderWidth: 1
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: '金额 (万元)'
                                }
                            }
                        },
                        plugins: {
                            title: {
                                display: true,
                                text: '历史合作金额趋势',
                                font: {
                                    size: 14
                                }
                            },
                            legend: {
                                position: 'top'
                            }
                        }
                    }
                });
            }
        }, 100);
    } else {
        contentArea.innerHTML = `<div style="color: #64748b; font-size: 16px; padding: 20px;">暂无该客户的分析数据</div>`;
    }
    
    // 组装右侧分屏
    rightScreen.appendChild(header);
    rightScreen.appendChild(contentArea);
    
    // 添加右侧面板到app容器
    if (appContainer) {
        appContainer.appendChild(rightScreen);
    }
    
    console.log('客户分析面板已添加');
}
