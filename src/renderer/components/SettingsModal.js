import React, { useState } from 'react';

const SettingsModal = ({ settings, onSave, onClose }) => {
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [model, setModel] = useState(settings.model);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ apiKey, model });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Settings</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label" htmlFor="apiKey">API Key (OpenAI or Anthropic)</label>
              <input
                type="password"
                id="apiKey"
                className="form-input"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="OpenAI: sk-... or Anthropic: sk-ant-..."
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="model">Model</label>
              <select
                id="model"
                className="form-select"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <optgroup label="OpenAI Models">
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="gpt-3.5-turbo-16k">GPT-3.5 Turbo 16K</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4-32k">GPT-4 32K</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                </optgroup>
                <optgroup label="Anthropic Models">
                  <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                  <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                  <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                  <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet</option>
                  <option value="claude-3-5-haiku-20240725">Claude 3.5 Haiku</option>
                  <option value="claude-3-7-sonnet-20250219">Claude 3.7 Sonnet</option>
                </optgroup>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="modal-button cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-button save-button">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;
