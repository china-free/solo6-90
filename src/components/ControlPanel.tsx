import React from 'react';
import { OpticalElement, RGB } from '../types';
import { rgbToCss } from '../utils/colors';

interface ControlPanelProps {
  levelName: string;
  levelDescription: string;
  currentLevelIdx: number;
  totalLevels: number;
  selectedElement: OpticalElement | null;
  isSolved: boolean;
  onReset: () => void;
  onPrevLevel: () => void;
  onNextLevel: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  levelName,
  levelDescription,
  currentLevelIdx,
  totalLevels,
  selectedElement,
  isSolved,
  onReset,
  onPrevLevel,
  onNextLevel,
  onRotateLeft,
  onRotateRight,
}) => {
  return (
    <div
      style={{
        width: 320,
        background: 'linear-gradient(180deg, #141638 0%, #0a0b20 100%)',
        borderLeft: '1px solid rgba(100, 130, 255, 0.25)',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        overflowY: 'auto',
        height: '100%',
      }}
    >
      <div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            background: 'linear-gradient(90deg, #8ab4ff, #c4a0ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 4,
          }}
        >
          ⚡ 非欧光学解谜
        </h1>
        <p style={{ fontSize: 12, color: 'rgba(180, 200, 255, 0.55)', margin: 0 }}>
          在折叠空间中引导光线
        </p>
      </div>

      <div
        style={{
          background: 'rgba(40, 50, 100, 0.35)',
          border: '1px solid rgba(120, 150, 255, 0.2)',
          borderRadius: 10,
          padding: 14,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: 'rgba(160, 180, 240, 0.7)', textTransform: 'uppercase', letterSpacing: 1 }}>
            关卡 {currentLevelIdx + 1} / {totalLevels}
          </span>
          {isSolved && (
            <span
              style={{
                fontSize: 11,
                color: '#7affa0',
                fontWeight: 600,
                padding: '2px 8px',
                background: 'rgba(100, 255, 150, 0.15)',
                borderRadius: 20,
              }}
            >
              ✓ 已通关
            </span>
          )}
        </div>
        <h2 style={{ fontSize: 16, color: '#e0e8ff', margin: '0 0 6px 0', fontWeight: 600 }}>
          {levelName}
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(180, 200, 255, 0.7)', margin: 0, lineHeight: 1.5 }}>
          {levelDescription}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onPrevLevel}
          disabled={currentLevelIdx === 0}
          style={btnStyle(currentLevelIdx === 0)}
        >
          ← 上一关
        </button>
        <button
          onClick={onNextLevel}
          disabled={currentLevelIdx === totalLevels - 1}
          style={btnStyle(currentLevelIdx === totalLevels - 1)}
        >
          下一关 →
        </button>
      </div>

      <button
        onClick={onReset}
        style={{
          ...btnStyle(false),
          background: 'rgba(180, 80, 80, 0.3)',
          borderColor: 'rgba(255, 120, 120, 0.4)',
          color: '#ffb0b0',
        }}
      >
        ↻ 重置关卡
      </button>

      <Divider />

      <div>
        <h3 style={sectionTitleStyle}>元件控制</h3>
        {selectedElement ? (
          <ElementDetail
            el={selectedElement}
            onRotateLeft={onRotateLeft}
            onRotateRight={onRotateRight}
          />
        ) : (
          <div
            style={{
              background: 'rgba(40, 45, 90, 0.4)',
              borderRadius: 8,
              padding: 16,
              textAlign: 'center',
              color: 'rgba(150, 170, 220, 0.6)',
              fontSize: 13,
            }}
          >
            点击画布中的可旋转元件（镜子/棱镜等）选中它
          </div>
        )}
      </div>

      <Divider />

      <div>
        <h3 style={sectionTitleStyle}>操作说明</h3>
        <ul style={listStyle}>
          <li>
            <kbd style={kbdStyle}>点击</kbd> 选中元件
          </li>
          <li>
            <kbd style={kbdStyle}>左键</kbd> 再次点击 = 顺时针旋转 15°
          </li>
          <li>
            <kbd style={kbdStyle}>右键</kbd> = 逆时针旋转 15°
          </li>
          <li>
            <kbd style={kbdStyle}>R</kbd> 重置当前关卡
          </li>
        </ul>
      </div>

      <Divider />

      <div>
        <h3 style={sectionTitleStyle}>元件图例</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <LegendItem color="#ffeedd" label="光源 - 发射光线" />
          <LegendItem color="#aabbdd" label="镜子 - 反射光线" />
          <LegendItem color="#88ccff" label="分光镜 - 透射+反射" />
          <LegendItem color="linear-gradient(90deg, #ff6666, #66ff66, #6666ff)" label="棱镜 - 白光分光RGB" />
          <LegendItem color="rgba(255,255,255,0.5)" label="滤光片 - 过滤颜色" />
          <LegendItem color="#ffcc66" label="接收器 - 接收目标色光" />
        </div>
      </div>

      <Divider />

      <div>
        <h3 style={sectionTitleStyle}>空间规则</h3>
        <p style={{ fontSize: 12, color: 'rgba(170, 190, 240, 0.7)', margin: 0, lineHeight: 1.6 }}>
          发光的墙壁代表空间折叠通道。光从一个通道口出去，会从对应的另一个通道口进来。
          注意：由于空间旋转，光的方向和落点位置都会根据折叠关系发生变换！
        </p>
      </div>
    </div>
  );
};

const ElementDetail: React.FC<{
  el: OpticalElement;
  onRotateLeft: () => void;
  onRotateRight: () => void;
}> = ({ el, onRotateLeft, onRotateRight }) => {
  const typeNames: Record<string, string> = {
    mirror: '反光镜',
    splitter: '分光棱镜',
    prism: '色散棱镜',
    filter: '滤光片',
    source: '光源',
    receiver: '接收器',
  };

  return (
    <div
      style={{
        background: 'rgba(60, 80, 150, 0.25)',
        border: '1px solid rgba(140, 170, 255, 0.3)',
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: el.color
              ? rgbToCss(el.color, 0.6)
              : 'rgba(150, 180, 255, 0.3)',
            border: `2px solid ${el.color ? rgbToCss(el.color, 1) : 'rgba(180, 200, 255, 0.6)'}`,
          }}
        />
        <div>
          <div style={{ fontSize: 15, color: '#e0e8ff', fontWeight: 600 }}>
            {typeNames[el.type] ?? el.type}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(150, 180, 240, 0.6)' }}>
            ID: {el.id}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: 'rgba(170, 190, 240, 0.75)' }}>角度：</span>
        <span style={{ fontSize: 14, color: '#ffd88a', fontWeight: 600, fontFamily: 'monospace' }}>
          {el.rotation}°
        </span>
      </div>

      {el.rotatable ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onRotateLeft} style={btnStyle(false)}>
            ⟲ 逆时针
          </button>
          <button onClick={onRotateRight} style={btnStyle(false)}>
            顺时针 ⟳
          </button>
        </div>
      ) : (
        <div
          style={{
            fontSize: 12,
            color: 'rgba(150, 170, 220, 0.55)',
            textAlign: 'center',
            padding: '8px 0',
          }}
        >
          此元件不可旋转
        </div>
      )}
    </div>
  );
};

const Divider: React.FC = () => (
  <div style={{ height: 1, background: 'rgba(100, 130, 255, 0.15)', margin: '4px 0' }} />
);

const LegendItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: 5,
        background: color,
        border: '1px solid rgba(180, 200, 255, 0.3)',
        flexShrink: 0,
      }}
    />
    <span style={{ fontSize: 12, color: 'rgba(180, 200, 255, 0.8)' }}>{label}</span>
  </div>
);

function btnStyle(disabled: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '10px 14px',
    background: disabled ? 'rgba(40, 45, 80, 0.5)' : 'rgba(80, 110, 200, 0.35)',
    border: `1px solid ${disabled ? 'rgba(80, 90, 140, 0.3)' : 'rgba(140, 170, 255, 0.4)'}`,
    borderRadius: 8,
    color: disabled ? 'rgba(150, 160, 200, 0.4)' : '#c8d8ff',
    fontSize: 13,
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s',
  };
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'rgba(160, 180, 240, 0.8)',
  textTransform: 'uppercase',
  letterSpacing: 1.5,
  fontWeight: 600,
  margin: '0 0 12px 0',
};

const listStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  background: 'rgba(60, 80, 140, 0.5)',
  border: '1px solid rgba(140, 170, 255, 0.4)',
  borderRadius: 4,
  fontSize: 11,
  color: '#d0d8ff',
  fontFamily: 'monospace',
  marginRight: 6,
};
