import React from 'react';

const MessageBubble = ({ role, content, isSystem, systemMessage }) => {
  // Function to format code blocks and inline code
  const formatContent = (text) => {
    // First, handle code blocks with triple backticks
    let formattedText = text.replace(/```([\s\S]*?)```/g, (match, code) => {
      return `<pre><code>${code}</code></pre>`;
    });
    
    // Then, handle inline code with single backticks
    formattedText = formattedText.replace(/`([^`]+)`/g, (match, code) => {
      return `<code>${code}</code>`;
    });
    
    // Replace newlines with <br> tags
    formattedText = formattedText.replace(/\n/g, '<br>');
    
    return formattedText;
  };

  // Determine the bubble class
  const getBubbleClass = () => {
    if (isSystem || systemMessage) {
      return 'message-bubble message-system';
    } else if (role === 'user') {
      return 'message-bubble message-user';
    } else {
      return 'message-bubble message-assistant';
    }
  };

  return (
    <div className={getBubbleClass()}>
      <div
        className="message-content"
        dangerouslySetInnerHTML={{ __html: formatContent(content) }}
      />
    </div>
  );
};

export default MessageBubble;
