# 四级代码题知识点速记（含易混对比）

对应「代码填空练习」里的四级 4 题：2.1.1、2.1.3、3.1.1、3.2.5，共 34 个空。

**怎么读：** 代码块是四道题里真正出现的空；🆚 是补充的关联、易混对比，题里没有但容易混淆。

## 🗂️ 一、文件与图片（2.1.1）

**流程：** 遍历 → 打开 → 转 RGB → 命名 → 保存 → 删旧文件

### ① 遍历文件夹
```python
for filename in sorted(os.listdir(folder)):
    path = os.path.join(folder, filename)
```
⚠ `listdir` 不保证顺序，编号题必须套 `sorted`
⚠ `listdir` 只给名字，要完整路径用 `os.path.join`

### ② 打开并转 RGB
```python
img = Image.open(path).convert('RGB')
```
⚠ jpg 没有透明通道，png 不转可能报错
🆚 `'RGB'` 彩色 ｜ `'L'` 灰度 ｜ `'RGBA'` 带透明

### ③ 编号命名
```python
new_name = f'{count:04d}.jpg'
```
等价写法：`'{:04d}.jpg'.format(count)`、`str(count).zfill(4) + '.jpg'`
⚠ 不补零会得到 `7.jpg`，应是 `0007.jpg`
口诀：`04d` = 补 0、共 4 位、整数

### ④ 保存为 jpg
```python
img.save(os.path.join(folder, new_name), 'JPEG')
```
⚠ 格式名是 `'JPEG'`，不是 `'JPG'`，也可以省略这个参数
🆚 **改名不等于转格式。** `os.rename` 只改名字，图片内容还是原来的格式；转格式必须 `Image.open` 再 `save`

### ⑤ 删旧文件
```python
if new_name != filename:
    os.remove(path)
```
⚠ 删的是 `path`，不是 `filename`
⚠ 新旧名字相同就不能删，否则会删掉刚存好的新图

**必背 3 点：**
- `sorted(os.listdir(...))`
- 存 jpg 前先 `convert('RGB')`
- 新旧名字不同才 `os.remove`

## 🏷️ 二、XML 转 CSV（2.1.3）

**流程：** 遍历 → 解析 → 取根 → 取文件名 → 遍历每个框 → 取类别 → 写 CSV

```xml
<annotation>
  <filename>img_001.jpg</filename>
  <object><name>car</name>...</object>
</annotation>
```

### ① 挑出 xml 文件
```python
for filename in sorted(os.listdir(folder)):
    if filename.endswith('.xml'):
```
⚠ 引号里要带点
🆚 `endswith` 区分大小写：`'img.XML'.endswith('.xml')` 得 `False`。稳妥写法是 `.lower().endswith('.xml')`，或用 `os.path.splitext(name)[1]` 取后缀

### ② 解析并取根
```python
tree = ET.parse(os.path.join(folder, filename))
root = tree.getroot()
```
🆚 `ET.parse(文件路径)` 得到整棵树，要再 `getroot()`；`ET.fromstring(字符串)` 直接得到根节点

### ③ 取文件名
```python
image_name = root.find('filename').text
```
⚠ `.text` 必加，不加得到的是标签对象
⚠ `find` 找不到时返回 `None`，再点 `.text` 会报错

### ④ 取所有框
```python
for obj in root.findall('object'):
    rows.append([image_name, obj.find('name').text])
```
口诀：`find` 找一个，`findall` 找全部
⚠ 一张图可以有多个框，一张图会写出多行
🆚 `findall('object')` 只找**直接子节点**；`iter('object')` 递归找**所有层**
🆚 `.text` 标签里的文字 ｜ `.attrib` 属性字典 ｜ `.tag` 标签名

### ⑤ 写 CSV
```python
with open('result.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['filename', 'class'])
    writer.writerows(rows)
```
⚠ `csv.writer(f)` 传的是文件对象，不是文件名
⚠ `newline=''` 必写
口诀：`row` 一行，`rows` 多行
🆚 `writerow` 传一个列表；`writerows` 传列表的列表
🆚 Excel 打开中文乱码时，把 `utf-8` 改成 `utf-8-sig`（文件开头会多 3 个标记字节）
🆚 `csv.writer` 写列表；`csv.DictWriter` 写字典，用 `writeheader()` 写表头
🆚 pandas 写法：`pd.DataFrame(rows, columns=['filename','class']).to_csv('result.csv', index=False)`

**必背 3 点：**
- `findall` 加 `for`
- `.text` 别漏
- 多行用 `writerows`

## 📊 三、pandas 统计与画图（3.1.1）

**流程：** 读 → 看 → 分堆求和 → 排序 → 取最大 → 筛选 → 再分堆 → 取前几 → 画图

### ① 读数据
```python
data = pd.read_csv('A超市的销售数据.csv')
```
⚠ 中文文件乱码时加 `encoding='gbk'`
🆚 `read_csv` 默认按 utf-8 读，读 gbk 文件会报 `UnicodeDecodeError`
🆚 Excel 文件用 `pd.read_excel(path)`

### ② 看数据
```python
data.head()        # 前 5 行
data.tail()        # 后 5 行
data.describe()    # 数值统计
data.info()        # 列名、类型、非空数
```
🆚 `describe()` 返回表格，固定 8 行：count、mean、std、min、25%、50%、75%、max
🆚 `info()` 直接打印，返回 `None`，后面不能再接别的

### ③ 数个数
```python
data['大类名称'].nunique()    # 4
```
🆚 **`nunique` VS `count`**（下面用 5 个值的小例子，其中 1 个缺失）：
```python
# s = ['食品','食品','生鲜', 缺失, '日用']
s.count()          # 4  非空个数，缺失不算
s.nunique()        # 3  不重复的种类数，缺失不算
len(s)             # 5  总行数，缺失也算
s.unique()         # 列出有哪几种
s.value_counts()   # 每种出现几次
```
口诀：`count` 数"有几个"，`nunique` 数"有几种"
这份数据里 `count()` 是 120，`nunique()` 是 4。

### ④ 分堆、求和、排序
```python
data.groupby('大类名称')['销售金额'].sum().sort_values(ascending=False)
```
口诀：分堆 → 盯一列 → 求和 → 排序
⚠ `ascending=False` 才是从大到小，默认是从小到大
⚠ `groupby` 之后还没有数字，要接 `.sum()` 才有
🆚 分堆后可以接不同的计算（以食品饮料为例）：

| 接什么 | 含义 | 结果 |
|---|---|---|
| `.sum()` | 求和 | 6903.44 |
| `.mean()` | 平均 | 138.07 |
| `.count()` | 非空个数 | 50 |
| `.size()` | 行数 | 50 |

🆚 `.reset_index()` 把结果从 `Series` 变回普通表格 `DataFrame`

### ⑤ 取最大
```python
top_category = category_sales.idxmax()    # '食品饮料'
```
🆚 `max()` 给金额；`idxmax()` 给名字；`argmax()` 给位置（第几个），这里是 0，不是名字
🆚 已经降序时，`category_sales.index[0]` 也是最大的名字

### ⑥ 筛选
```python
sub_data = data[data['大类名称'] == top_category]
```
⚠ 两个等号 `==`，一个等号是赋值，会报 `SyntaxError`
🆚 多条件用 `&`，不能用 `and`，每个条件要加括号：
```python
data[(data['大类名称'] == '食品饮料') & (data['销售金额'] > 100)]
```
🆚 写 `and` 会报 `ValueError: The truth value of a Series is ambiguous`

### ⑦ 取前几名
```python
sub_sales = sub_data.groupby('小类名称')['销售金额'].sum().sort_values(ascending=False).head(15)
print(sub_sales.head(5))
```
⚠ 不足 15 个也不报错，只是全部给你
🆚 `head(n)` 前 n 个，`tail(n)` 后 n 个

### ⑧ 画图
```python
sub_sales.plot(kind='bar', figsize=(10, 5))
```
口诀：`figsize` 宽在前、高在后，单位是英寸
🆚 `kind=` 选图型：`'bar'` 柱状 ｜ `'barh'` 横向柱 ｜ `'line'` 折线 ｜ `'pie'` 饼图 ｜ `'hist'` 直方图
🆚 选图：比大小用柱状，看趋势用折线，看占比用饼图，看两个数的关系用散点

**必背 4 点：**
- `ascending=False` 是从大到小
- `idxmax()` 给名字
- 筛选用 `==`
- 多条件用 `&` 并加括号

## 🤖 四、线性回归（3.2.5）

**流程：** 读 → 看 → 画 → 取 X、y → 建 → 训 → 看 → 预测

### ① 读与看
```python
data = pd.read_csv('Salary_Data.csv')
print(data.head())
print(data.describe())
```
🆚 `head()` 看原始的几行，`describe()` 看统计摘要

### ② 散点图
```python
plt.scatter(data['YearsExperience'], data['Salary'])
plt.xlabel('YearsExperience')
plt.ylabel('Salary')
plt.savefig('3.2.5-1.jpg')
plt.show()
```
⚠ `plt.scatter(x, y)` 两个参数在同一个空里：先 x（年限），后 y（薪资）
⚠ `savefig` 要写在 `show()` 之前，`show()` 之后再存，存出来是空白图
🆚 `plt.show()` 显示；`plt.savefig('文件名.jpg')` 存成文件
🆚 `plt.scatter` 散点；`plt.plot` 折线
⚠ 图里有中文变方块时，要设置中文字体（如 `plt.rcParams['font.sans-serif'] = ['SimHei']`，字体得是电脑上有的）

### ③ 取 X 和 y
```python
X = data[['YearsExperience']]    # 二维 (24, 1)
y = data['Salary']               # 一维 (24,)
```
口诀：X 双括号，y 单括号
⚠ X 写成单括号会报错，因为要求二维

### ④ 建与训
```python
model = LinearRegression()
model.fit(X, y)
```
⚠ 括号别漏
⚠ `fit` 先 X 后 y，不需要赋值
🆚 `fit` 学习 ｜ `predict` 预测 ｜ `score` 打分
🆚 `fit_transform` 是"学完顺便变换"，只用于标准化这类处理，模型没有 `transform`

### ⑤ 看结果
```python
print('系数:', model.coef_[0])
print('截距:', model.intercept_)
```
⚠ 末尾下划线表示训练之后才有
⚠ `coef_` 是数组，要 `[0]` 取第一个
口诀：薪资 = 系数 × 年限 + 截距
示例数据（用 numpy 手算）：系数约 9594.33，截距约 23389.37

### ⑥ 预测
```python
pred = model.predict([[7]])
print(pred[0])
```
⚠ 两层方括号，表示一行一列
⚠ 写 `predict(7)` 会报错，要求二维
⚠ 返回的是数组，取值用 `pred[0]`
🆚 备选写法 `model.predict(pd.DataFrame({'YearsExperience': [7]}))`，可以避免列名警告
示例数据下 7 年的预测约 90549.70

### ⑦ 关联知识
🆚 **回归 VS 分类：** `LinearRegression` 预测数值；`LogisticRegression` 名字带 Regression，但做分类，预测类别。
🆚 **指标：** 回归用 `r2_score`、`mean_squared_error`；分类用 `classification_report`。
🆚 **本题不划分数据集。** 常规流程是：
```python
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model.fit(X_train, y_train)
y_pred = model.predict(X_test)
```

**必背 4 点：**
- X 双括号，y 单括号
- `fit(X, y)`
- 系数和截距带下划线
- `predict([[7]])`

## 🧠 五、全部最关键的 5 句

1. 遍历文件要 `sorted`，改格式要 `convert('RGB')` 再 `save`，不是改名。
2. `find` 找一个，`findall` 找全部；`.text` 必加；多行写 `writerows`。
3. `count` 数有几个，`nunique` 数有几种。
4. 分堆、盯一列、求和、排序，`ascending=False` 是从大到小。
5. X 双括号，y 单括号；`fit(X, y)`；`predict([[7]])`。

## 说明

- **运行验证过的部分：** `count` / `nunique`、`groupby` 各种计算、`idxmax` / `argmax`、`describe` / `info`、`and` 报错、`to_csv`、`gbk` 读取报错、`find` / `findall` / `iter`、`fromstring`、`utf-8-sig`、`DictWriter`、单双括号形状。这些都在示例数据上真实运行过。
- **没有运行的部分：** `'JPEG'` 与 `'JPG'`、RGBA 转 jpg 报错、`savefig` 顺序、`predict(7)` 报错、中文字体、`pd.read_excel`、各种 `kind=` 取值，是通行用法，不是本机运行结果。本机没装 Pillow、matplotlib 和 scikit-learn。
- **参考代码不是官方的。** 四级这几题的参考代码是我按题干写的，示例数据也是我生成的，数值只用来帮助理解。
