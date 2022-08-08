import React from 'react';
import { Button, Tag, Input } from 'antd';
// import 'antd/dist/antd.less';
import './App.less';

function App() {
  return (
    <div className="App">
      <Button type='primary' ghost >确定</Button>
      <Input style={{width: '100px', marginLeft: '16px'}} />
    </div>
  );
}

export default App;
