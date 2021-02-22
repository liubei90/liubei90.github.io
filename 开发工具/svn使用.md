# svn基本使用

```
// 检出
svn checkout svn://xxx.xxx.xxx/ --username=xxx

// 更新
svn update

// 查看状态
svn status

// 将文件加入到版本控制
svn add xxx.xx

// 提交到版本库
svn commit -m "xxx"

// 回退未提交变更
svn revert xxx.xx
// 回退未提交变更目录
svn revert -R xxx_dir

// 查看提交历史
svn log

// 创建分支
svn copy trunk/ branches/my_branch/
// 提交创建的分支
svn commit -m "xxx"

// 合并分支
svn merge ../branches/my_branch/
// 提交合并操作
svn commit -m "xxx"

```