import React, { useRef, useState } from "react";
import { Form, Input, Button } from "antd";
import "antd/dist/antd.css";

const { Item } = Form;

function InputWrapper(props) {
  return (
    <>
      <Input {...props} />
      <div>支持中英文</div>
    </>
  );
}

//
function Form1() {
  return (
    <Form>
      <Item
        label="姓名"
        name="name"
        rules={[{ required: true, message: "请输入姓名" }]}
      >
        {/* <Input />
        <div>支持中英文</div> */}
        <InputWrapper />
      </Item>

      <Button htmlType="submit">提交</Button>
    </Form>
  );
}

function FormDemo() {
  return (
    <div className="App">
      <div>
        <h2>如何在Form.Item中写额外的元素</h2>
        <Form1 />
      </div>
    </div>
  );
}

export default FormDemo;
