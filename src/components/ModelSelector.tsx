import type { ModelInfo } from '../bonsai-api';

interface Props {
  models: ModelInfo[];
  currentModel: ModelInfo;
  onSelect: (model: ModelInfo) => void;
  onClose: () => void;
}

export default function ModelSelector({ models, currentModel, onSelect, onClose }: Props) {
  return (
    <div className="model-selector" onClick={onClose}>
      <div className="model-selector-sheet" onClick={e => e.stopPropagation()}>
        <h2>Select Model</h2>
        {models.map(model => (
          <div
            key={model.id}
            className={`model-option ${model.id === currentModel.id ? 'active' : ''}`}
            onClick={() => onSelect(model)}
          >
            <div>
              <div className="name">{model.name}</div>
              <div className="size">{model.size} · {model.description}</div>
            </div>
            {model.id === currentModel.id && <span className="check">✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
