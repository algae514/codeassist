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
              <label className="form-label" htmlFor="apiKey">OpenAI API Key</label>
              <input
                type="password"
                id="apiKey"
                className="form-input"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
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
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
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
