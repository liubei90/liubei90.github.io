import { useRef, useState } from "react";
import "./App.css";

function ControlledTabs({ tabList, value, onChange }) {
  return (
    <ul>
      {tabList.map((tab) => (
        <li
          className={value === tab.key ? "active" : ""}
          onClick={() => {
            onChange(tab.key);
          }}
        >
          {tab.title}
        </li>
      ))}
    </ul>
  );
}

function UnControlledTabs({ tabList, defaultValue, onChange }) {
  const [value, setValue] = useState(() => {
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    if (tabList.length) {
      return tabList[0].key;
    }

    return null;
  });

  return (
    <ul>
      {tabList.map((tab) => (
        <li
          className={value === tab.key ? "active" : ""}
          onClick={() => {
            setValue(tab.key);
            onChange(tab.key);
          }}
        >
          {tab.title}
        </li>
      ))}
    </ul>
  );
}

function App() {
  return (
    <div className="App">
      <UnControlledTabs
        defaultValue={2}
        onChange={(v) => {
          console.log(v);
        }}
        tabList={[
          { key: 1, title: "tab1" },
          { key: 2, title: "tab2" },
        ]}
      ></UnControlledTabs>
    </div>
  );
}

export default App;
