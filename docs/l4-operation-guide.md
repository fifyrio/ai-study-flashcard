# 人工智能训练师（四级）实操：循序渐进模板

适合有 Python 基础语法、但不熟悉 AI 训练的人。照着阶段 1 到 7 的顺序学，每一阶段只比上一阶段多一点。

- 材料来源：三级考前视频 4 个、一页纸速查表、我们已经分析过的四级题库和评分表。
- 标记：★ 四级要用　☆ 三级才考，四级当加餐。
- 代码块都在干净环境里运行过。带 `run=` 的块可以直接复制运行；其余是片段。

## 路线图

| 阶段 | 学什么 | 时间 | 对应四级题 |
|---|---|---|---|
| 1 | 5 个符号，学会读懂填空 | 30 分钟 | 所有填空 |
| 2 | 5 个 AI 训练概念 | 20 分钟 | 所有题 |
| 3 | pandas：读 · 改 · 存 | 2~3 小时 | 3.1、3.2（各 20 分，抽一）、2.1 的数据部分 |
| 4 | 建模：读 · 切 · 建 · 跑 · 看 | 1.5 小时 | 3.2 的薪资题；三级 2.2 |
| 5 | 两套文件处理模板 | 1 小时 | 2.1（30 分里的代码部分） |
| 6 | 写作模板 | 2 小时 | 1.1（20）、1.2（10）、2.2（20）等写作项 |
| 7 | 三级加餐 | 有时间再看 | 四级不考 |

练习：每学完一个阶段，去 `code-quiz/index.html` 做对应的题（见附录 C）。

---

## 阶段 1：先认 5 个符号

目标：看到一行代码，能说出它在做什么。视频里反复强调一句话：**填空只占 20%，其余 80% 是线索。**

### 1. 等号 = 贴标签

```python
data = pd.read_csv('patient_data.csv')
```

先算右边（读文件，得到一张表），再把这张表贴上名字 `data`。以后要用这张表，喊 `data` 就行。`df`、`X`、`y`、`model` 都是这样的名字。

### 2. 方括号 `[ ]` 有两个身份

```python
bmi_bins = [0, 18.5, 24, 28]     # 前面没有东西：造一个列表
ages = data['Age']               # 紧贴着变量：从 data 里取出 Age 这一列
```

一秒识别：左边没东西 = 造，紧贴变量 = 取。`data[['Age', 'BMI']]` 外层是「取」，里层是「造列表」，结果是取出两列的小表。

### 3. 花括号 `{ }` = 字典（名字:值，成对出现）

```python
emotion = {'happy': 1, 'sad': 2, 'angry': 3}
data = data.rename(columns={'PatientID': '患者ID'})     # 把列名 PatientID 改成 患者ID
```

### 4. 圆括号 `( )` = 按下按钮

`data.head` 光说名字，什么也不会发生；`data.head()` 加了括号才真的执行。括号里写的是「旋钮」：

```python
pd.cut(data['Age'], bins=age_bins, labels=age_labels, right=False)
```

`bins=`、`labels=` 这些左边的名字不能改，右边填你自己的值。

### 5. 点号 `.` = 用它的功能

`data.head()` 读作「data 的 head 功能」。可以连着点，从左往右一段一段读：

```python
data['RiskLevel'].value_counts()     # 取出 RiskLevel 这一列 → 数每个值出现几次
```

### 读空的三个线索

1. **变量名藏在前面。** 空的左边写了 `cleaned_data = `，下面就一定会用到 `cleaned_data`。
2. **注释直接给答案。** 空的上一行注释写着「保存成 csv」，答案里就有 `to_csv`。
3. **下一行给线索。** 下一行用了 `X_train`，这一行的空就是 `X_train, X_test, ... = train_test_split(...)`。

练习：下面这一行的空是什么？

```text
# 把清洗后的数据保存成 csv，不要多出一列行号
cleaned_data.________('2.1.1_cleaned_data.csv', index=False)
```

答案：`to_csv`。线索：注释写了「保存成 csv」，参数 `index=False` 是 `to_csv` 才有的旋钮。

---

## 阶段 2：5 个 AI 训练概念（大白话）

| 概念 | 一句话 | 代码里长什么样 |
|---|---|---|
| 数据集 | 一张表：一行是一个样本，一列是一个属性 | `data.shape` 得到 (行数, 列数) |
| 特征 X 和标签 y | X 是用来猜的列，y 是要猜的那一列 | `X = data[['YearsExperience']]`　`y = data['Salary']` |
| 数据清洗 | 处理缺失值、重复值、类型错误、异常值，不然模型会学歪（垃圾进，垃圾出） | `dropna()`　`fillna()`　`drop_duplicates()` |
| 训练集和测试集 | 数据分成 8:2，80% 让模型学，20% 留着「考试」，检查它是不是真学会了 | `train_test_split(X, y, test_size=0.2)` |
| 模型：学、猜、打分 | fit = 学习；predict = 用学到的东西去猜；score、R²、准确率 = 打分 | `model.fit(X, y)`　`model.predict(X)` |

三级才会遇到的三个词：
- ☆ 标准化：把不同单位的列拉到同一个尺度，比如身高（厘米）和体重（公斤）。
- ☆ 过拟合：训练集上分数很高，测试集上很差，等于「只会背题」。
- ☆ 类别不平衡：正负样本比例悬殊，比如 95% 都是正常、5% 才是违约。

---

## 阶段 3：pandas「读 · 改 · 存」

数据处理题说白了只有 3 件事：**读**（把文件读进来）、**改**（加列、清洗、转类型、统计）、**存**（保存结果）。

四级 3.1 和 3.2 的数据题，用到的就是下面这些，从上到下一步一步加：

> 下面的块都带 `run=chain:s3`，意思是按顺序连着运行，后面的块会用到前面定义的 `data`。

### 3.1 读和看 ★

```python run=chain:s3
import pandas as pd
import numpy as np

# 练习用的小表。考试里这一行是：data = pd.read_csv('patient_data.csv')
data = pd.DataFrame({
    'PatientID': ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
    'Age': [45, 32, 67, 25, 58, 39],
    'BMI': [28.5, 22.1, 31.0, 17.9, 26.4, 23.5],
    'DaysInHospital': [12, 5, 9, 3, 8, 6],
})

print(data.head())        # 看前 5 行
print(data.shape)         # (行数, 列数)
print(len(data))          # 行数
data.info()               # 每列的类型，有没有空值
print(data.describe())    # 数字列的个数、平均值、最大最小值
```

读不同格式的文件：`pd.read_csv('a.csv')`、`pd.read_excel('a.xlsx')`。csv 乱码时加 `encoding='gbk'`。

### 3.2 新增一列，数一数 ★

```python run=chain:s3
# 住院超过 7 天算高风险。np.where(条件, 成立时的值, 不成立时的值)
data['RiskLevel'] = np.where(data['DaysInHospital'] > 7, '高风险', '低风险')

print(data['RiskLevel'].value_counts())               # 每种出现几次
print(data['RiskLevel'].value_counts() / len(data))   # 占比
```

分区间用 `pd.cut`：

```python run=chain:s3
bmi_bins = [0, 18.5, 24, 28, np.inf]           # 区间边界；np.inf 是正无穷
bmi_labels = ['偏瘦', '正常', '超重', '肥胖']
# right=False 表示左闭右开：[18.5, 24) 属于「正常」
data['BMIRange'] = pd.cut(data['BMI'], bins=bmi_bins, labels=bmi_labels, right=False)
print(data['BMIRange'].value_counts())
```

用一个小函数生成新列，或直接做算术：

```python run=chain:s3
data['AgeGroup'] = data['Age'].apply(lambda x: '青年' if x < 40 else '中老年')
data['Age_months'] = data['Age'] * 12          # 列和数字直接运算
data['score'] = data[['Age', 'BMI']].mean(axis=1)   # 每一行里几列求平均（比如口味、环境、服务的综合评分）
print(data[['Age', 'AgeGroup', 'Age_months', 'score']])
```

### 3.3 分组汇总 ★

```python run=chain:s3
# 按 RiskLevel 分组，看每组 Age 的个数和平均值
print(data.groupby('RiskLevel')['Age'].agg(['count', 'mean']))

# 按 BMI 区间分组，求住院天数的平均值（observed=False：没人的区间也显示）
print(data.groupby('BMIRange', observed=False)['DaysInHospital'].mean())

# 每组求和
print(data.groupby('RiskLevel')['DaysInHospital'].sum())

# 同时算好几列，每列用不同的算法（电影院题：分组后算平均票价和平均售票数）
print(data.groupby('RiskLevel').agg({'Age': 'mean', 'BMI': 'mean'}))

# 平均值最大的那一组叫什么（气象题：压力差平均值最大的月份）
print(data.groupby('RiskLevel')['Age'].mean().idxmax())

# 两列的协方差、相关系数（顾客体验题：小费和总金额的关系）。正数 = 一起变大；相关系数在 -1 到 1 之间
print(data[['Age', 'BMI']].cov())
print(data[['Age', 'BMI']].corr())
```

读法：`groupby('分组依据')['要算的列'].算法()`。

### 3.4 排序、取前 N ★

```python run=chain:s3
top = data.sort_values('DaysInHospital', ascending=False).head(3)   # 从大到小排，取前 3
print(top)
print(data.nlargest(3, 'DaysInHospital'))                           # 同样的结果，更短
```

`ascending=False` 是从大到小，不写是从小到大。

### 3.5 筛选 ★

```python run=chain:s3
old = data[data['Age'] > 40]                                  # 一个条件
both = data[(data['Age'] > 40) & (data['BMI'] > 25)]          # 多个条件：每个加括号，& 是「且」，| 是「或」
mid = data[data['Age'].between(30, 50)]                       # 30 到 50 岁
chosen = data[data['PatientID'].isin(['P1', 'P3'])]           # 在这个列表里的
print(len(old), len(both), len(mid), len(chosen))
```

### 3.6 日期处理 ★

四级 3.2 的优惠券题、在线教育题都考这个：转日期格式、算时间差、算年龄。

```python run=chain:s3
coupons = pd.DataFrame({
    'user': ['a', 'b', 'c', 'd', 'e'],
    '领券日期': ['20160201', '20160215', None, '20160301', '20160305'],
    '消费日期': ['20160210', '20160212', '20160320', None, '20160315'],
})
# 删除领券和消费日期中有空值的行
coupons = coupons.dropna(subset=['领券日期', '消费日期'])
# 转成日期格式（原来是 20160201 这种字符串，format 告诉它每一位的含义）
coupons['领券日期'] = pd.to_datetime(coupons['领券日期'], format='%Y%m%d')
coupons['消费日期'] = pd.to_datetime(coupons['消费日期'], format='%Y%m%d')
# 去掉消费日期早于领券日期的记录
coupons = coupons[coupons['消费日期'] >= coupons['领券日期']]
# 新增一列：领券到消费的天数。两个日期相减得到「时间差」，.dt.days 取出天数
coupons['领券到消费天数'] = (coupons['消费日期'] - coupons['领券日期']).dt.days
print(coupons['领券到消费天数'].value_counts())      # 出现最多的间隔排在最前面
```

取年、月，以及用生日算年龄：

```python run=chain:s3
users = pd.DataFrame({
    'user_id': [1, 2, 3, 4, 5],
    'birthday': ['2005-03-01', '1999-12-30', '2012-07-15', '2008-01-20', '1990-05-05'],
    'gender': [1, 0, 2, 1, 0],
})
users['birthday'] = pd.to_datetime(users['birthday'], format='%Y-%m-%d')
users['year'] = users['birthday'].dt.year          # .dt.month、.dt.hour 同理

abnormal = users[users['birthday'] <= '2000-01-01']       # 筛出 2000-01-01 及之前的异常数据
users = users[users['birthday'] > '2000-01-01']           # 去掉它们

print(users['gender'].value_counts())                     # 看看性别列有哪些值
users['gender'] = users['gender'].replace(2, 0)           # 把异常值 2 改成 0
print(len(users), (users['gender'] == 1).sum(), (users['gender'] == 0).sum())   # 总数、男、女

users['age'] = (pd.Timestamp.today() - users['birthday']).dt.days // 365   # 年龄
print(users['age'].value_counts().head(3))                # 最多的前 3 个年龄
```

### 3.7 清洗 ★

```python run=chain:s3
messy = data[['PatientID', 'Age', 'BMI']].copy()
messy['Age'] = messy['Age'].astype(object)
messy.loc[1, 'BMI'] = np.nan            # 造一个缺失值
messy.loc[2, 'Age'] = '未知'              # 造一个类型错误
messy = pd.concat([messy, messy.iloc[[0]]])   # 造一行重复

print(messy.isnull().sum())             # 每列有几个空值
print(messy.duplicated().sum())         # 有几行重复

messy = messy.drop_duplicates()                                  # 删重复行
messy['Age'] = pd.to_numeric(messy['Age'], errors='coerce')      # 转数字，转不了的变成空值
messy['BMI'] = messy['BMI'].fillna(messy['BMI'].mean())          # 用平均值填空值
messy = messy.dropna(subset=['Age'])                             # 删掉 Age 为空的行
messy = messy.rename(columns={'PatientID': '患者ID'})            # 改列名
print(messy)
```

填空值的其他写法：`.fillna(0)` 用固定值；`.ffill()` 用上一行的值（视频速查表里写的 `fillna(method='ffill')` 是旧写法，新版 pandas 已不推荐）。删列：`data.drop(columns=['某列'])`。

### 3.8 画图 ★

```python run=chain:s3
import matplotlib.pyplot as plt

data['RiskLevel'].value_counts().plot(kind='bar')    # 柱状图；kind='line' 折线图，'pie' 饼图
plt.title('RiskLevel')
plt.show()

plt.scatter(data['Age'], data['DaysInHospital'])     # 散点图：x 轴、y 轴
plt.xlabel('Age')
plt.ylabel('DaysInHospital')
plt.show()
```

图里要显示中文，在画图前加两行：`plt.rcParams['font.sans-serif'] = ['SimHei']` 和 `plt.rcParams['axes.unicode_minus'] = False`。

### 3.9 标准化和存文件

```python run=chain:s3
from sklearn.preprocessing import StandardScaler

scaled = data.copy()
cols = ['Age', 'BMI']
scaled[cols] = StandardScaler().fit_transform(scaled[cols])    # ☆ 每列减平均值再除以标准差，等价于 (x - mean) / std

scaled.to_csv('patients_clean.csv', index=False)               # ★ index=False：不要多存一列行号
X = data[['Age', 'BMI']]
y = data['DaysInHospital']
both = pd.concat([X, y], axis=1)                                # 把特征和目标并排合成一张表
both.to_csv('both.csv', index=False)
print(both.shape)
```

### 3.10 完整模板：超市销售分析 ★

这是四级 3.1.1 的完整答案结构：读 → 统计 → 取最大 → 画图。用我们生成的示例数据 `A超市的销售数据.csv`（列：订单号、大类名称、小类名称、销售金额）。

```python run=sales
import pandas as pd
import matplotlib.pyplot as plt

# 读：加载数据，看前 5 行，统计大类名称的个数
data = pd.read_csv('A超市的销售数据.csv')
print(data.head())
print('大类名称个数:', data['大类名称'].nunique())

# 改：每个大类的总销售金额，从大到小
category_sales = data.groupby('大类名称')['销售金额'].sum().sort_values(ascending=False)
print(category_sales)

# 最大的大类，以及它下面销售金额最大的前 15 个小类
top_category = category_sales.idxmax()
sub_data = data[data['大类名称'] == top_category]
sub_sales = sub_data.groupby('小类名称')['销售金额'].sum().sort_values(ascending=False).head(15)

# 画柱状图
sub_sales.plot(kind='bar', figsize=(10, 5))
plt.title('top 15 sub categories')
plt.show()

# 前 5 个小类，用来写备货建议
print(sub_sales.head(5))
```

Excel 部分（3.1 的补缺失值，视频里没讲，这是我补的通用做法）：选中列 → Ctrl+Shift+L 筛选 → 选「空白」→ 在第一个空白格输入要填的值 → Ctrl+Enter 一次填满。

---

## 阶段 4：建模「读 · 切 · 建 · 跑 · 看」

视频里最重要的一句话：**所有建模题就是这 5 步**。看懂这 5 步，线性回归、Logistic、随机森林、XGBoost 都一样写，只换第 3 步的模型名。

| 步骤 | 做什么 | 代码 |
|---|---|---|
| 读 | 读数据，分出 X 和 y | `data = pd.read_csv(...)`　`X = ...`　`y = ...` |
| 切 | 分训练集和测试集 | `train_test_split(X, y, test_size=0.2, random_state=42)` |
| 建 | 选一个模型 | `LinearRegression()` |
| 跑 | 学习，再预测 | `model.fit(X_train, y_train)`　`model.predict(X_test)` |
| 看 | 打分 | `r2_score(y_test, y_pred)` |

### 4.1 线性回归：四级 3.2.5 薪资题 ★

四级里用到建模的是 3.2.5 薪资题，只要求：用**全部**数据建模（不切分），求直线的系数和截距，预测 7 年经验的薪资。其他 3.2 变体（顾客体验、电商、优惠券、在线教育）都是阶段 3 的数据处理。

```python run=salary
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression

data = pd.read_csv('Salary_Data.csv')
print(data.head())
print(data.describe())

plt.scatter(data['YearsExperience'], data['Salary'])     # 先画散点图，看年限和薪资的关系
plt.show()

X = data[['YearsExperience']]      # 特征：两层方括号，得到一张表（sklearn 要求 X 是表）
y = data['Salary']                 # 目标：一层方括号，得到一列
model = LinearRegression()         # 建
model.fit(X, y)                    # 跑：学习

print('系数:', model.coef_[0])     # 直线的斜率：工作年限每多 1 年，薪资多多少
print('截距:', model.intercept_)   # 直线的截距：0 年经验时的薪资

pred = model.predict(pd.DataFrame({'YearsExperience': [7]}))   # 预测 7 年经验
print('7 年经验的预期薪资:', pred[0])
```

为什么 `X` 要两层方括号？`data['YearsExperience']` 是一列，`data[['YearsExperience']]` 是只有一列的表。模型要的是表。

「优化模型的建议」写 1~3 条就能拿分，见阶段 6。

加上「切」和「看」，就是完整的 5 步：

```python run=salary
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_squared_error

data = pd.read_csv('Salary_Data.csv')
X = data[['YearsExperience']]
y = data['Salary']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)   # 切
model = LinearRegression()                                                                  # 建
model.fit(X_train, y_train)                                                                 # 跑：只用训练集学
y_pred = model.predict(X_test)                                                              # 跑：猜测试集
print('R2:', r2_score(y_test, y_pred))                    # 看：越接近 1 越好
print('MSE:', mean_squared_error(y_test, y_pred))         # 看：误差平方的平均，越小越好
print('训练集得分:', model.score(X_train, y_train))
```

### 4.2 分类和保存模型 ☆

Logistic 回归是预测「是 / 否」的模型。步骤和线性回归完全一样，只换模型名：

```python run=cls
import pickle
import pandas as pd
from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split

# 造一份「正常多、违约少」的练习数据；考试里是 pd.read_csv('finance数据集.csv')
X_raw, y_raw = make_classification(n_samples=300, n_features=5, weights=[0.9, 0.1], random_state=42)
X = pd.DataFrame(X_raw, columns=['f1', 'f2', 'f3', 'f4', 'f5'])
y = pd.Series(y_raw)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)   # 切
model = LogisticRegression(max_iter=1000)                                                   # 建
model.fit(X_train, y_train)                                                                 # 跑

with open('model.pkl', 'wb') as file:        # 保存模型：wb = 以二进制写入
    pickle.dump(model, file)                 # dump(要存的东西, 存到哪个 file)

y_pred = model.predict(X_test)
pd.DataFrame(y_pred, columns=['预测结果']).to_csv('results.txt', index=False)

print(classification_report(y_test, y_pred, zero_division=1))    # 看：精确率、召回率、F1
print('准确率:', (y_test == y_pred).mean())
```

类别不平衡时用 SMOTE 补充少数类样本，再重新训练。注意：**只对训练集做 SMOTE，测试集不动。**

```python run=smote
import pandas as pd
from imblearn.over_sampling import SMOTE
from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

X_raw, y_raw = make_classification(n_samples=300, n_features=5, weights=[0.9, 0.1], random_state=42)
X = pd.DataFrame(X_raw)
y = pd.Series(y_raw)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = LogisticRegression(max_iter=1000).fit(X_train, y_train)

smote = SMOTE(random_state=42)
X_resampled, y_resampled = smote.fit_resample(X_train, y_train)      # 补充少数类样本
model.fit(X_resampled, y_resampled)                                  # 重新训练
y_pred_resampled = model.predict(X_test)                             # 还是预测原来的测试集
print('重新采样后的准确率:', (y_test == y_pred_resampled).mean())
```

---

## 阶段 5：两套文件处理模板（2.1 的代码部分）★

四级 2.1 一共 30 分：labelImg 标注占 15 分，剩下是代码和交结果。代码只有两种，题目里是哪一种，就背哪一套。

### 模板一：图片转 jpg 并按 0000 重命名（性别、肤色两题）

```python run=pics
import os
from PIL import Image

folder = '2.1.1pic'
count = 0

for filename in sorted(os.listdir(folder)):          # 列出文件夹里所有文件，排好序
    path = os.path.join(folder, filename)            # 拼出完整路径
    img = Image.open(path).convert('RGB')            # 打开图片，转成 RGB（存 jpg 需要）
    new_name = f'{count:04d}.jpg'                    # 4 位数字：0000.jpg、0001.jpg……
    img.save(os.path.join(folder, new_name), 'JPEG') # 另存为 jpg
    if new_name != filename:
        os.remove(path)                              # 新旧名字不同时，删掉旧文件
    count += 1

print(sorted(os.listdir(folder)))
```

### 模板二：把 XML 标注提取成 CSV（运输工具、相册、动物三题）

labelImg 标完后，每张图有一个同名 XML。代码要遍历这些 XML，把「图片名 + 类别」写进 `result.csv`。

```python run=xml
import os
import csv
import xml.etree.ElementTree as ET

folder = 'dataset'
rows = []

for filename in sorted(os.listdir(folder)):
    if filename.endswith('.xml'):
        tree = ET.parse(os.path.join(folder, filename))     # 读一个 xml
        root = tree.getroot()                               # 最外层标签
        image_name = root.find('filename').text             # 找到 <filename> 标签，取里面的文字
        for obj in root.findall('object'):                  # 一张图里可能有多个框
            rows.append([image_name, obj.find('name').text])

with open('result.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['filename', 'class'])                  # 表头
    writer.writerows(rows)                                  # 把所有行一次写入

print(open('result.csv', encoding='utf-8').read())
```

交卷提醒：结果文件放进「准考证号 + 身份证后 6 位」命名的文件夹，文件名和题目要求完全一致。

---

## 阶段 6：写作模板

这些题不用写代码，背固定框架，再按题目里的行业换词。

### 6.1 视频里的「万能攻势」：三类问题，三类答案 ★

三级 1.2 理论题的套路，四级 1.2「优化建议」和 3.x 的「优化建议」同样适用：

| 问题是什么 | 答案往这几个方向写 |
|---|---|
| 准确性不高 | ① 数据：清洗、扩充、标注（垃圾进，垃圾出）② 模型：升级模型、调整参数 |
| 响应慢 / 延迟高 | ① 优化算法 ② 优化系统：升级硬件、并行、缓存 |
| 功能单一 / 缺乏个性化 | 个性化定制、增加用户交互、友好的界面、定制化接口 |

答题要点：第一问「找出问题」，直接抄题目里的描述；第二问再按上面的方向各写一句「步骤 + 效果」。

### 6.2 四级 1.1：质量评估报告和规范 ★

找问题（图像题）：找出 2 组重复或冗余图，2 张模糊或严重遮挡的图（各 4 分）。

写质量评估报告，图像题固定写 4 个方面（每个 1 分）：

| 方面 | 怎么写 |
|---|---|
| 图片尺寸与格式 | 大部分是什么尺寸和格式，有没有个别不符的 |
| 清晰度、噪声与干扰物 | 大部分清晰，个别模糊、遮挡、反光 |
| 数据重复 | 有少量重复，已记录并建议去重 |
| 类别分布 | 各类别是否均匀，罕见类别是否缺少 |

数据题（表格或评论）换成这 4 个维度：**准确性、完整性、一致性、重复性**（评论题里「一致性」换成「平衡性」；销售题还要写用户隐私、时效性）。每个维度写「发现了什么问题 + 一个具体例子」。

| 规范 | 常见写法 |
|---|---|
| 采集规范 | 采集范围：多种场景（道路类型、天气、白天夜晚）；采集设备：足够的清晰度和分辨率；色彩准确，曝光合适 |
| 数据整理规范 | 清洗：去掉无关、重复、模糊、损坏的数据；标准化：统一命名、尺寸、格式，必要时校正亮度对比度、去噪 |
| 归类规范 | 树形目录：先按内容类型，再按天气或时间分层 |

### 6.3 四级 1.2：采集和处理流程优化 ★

固定写法：采集优化 3 条（每条 2 分，最多 6 分）＋处理优化 2 条（最多 4 分）。

- 采集优化：① 增加数据质量检查环节，剔除模糊、重复、不合格的图；② 优化采集路线或范围，覆盖所有场景；③ 优化采集时间，全天候、多时段。
- 处理优化，任选 2 条：提升采集设备质量；用图像增强（锐化、去噪、色彩校正）；统一标注规范并培训标注人员；调整采样策略，平衡各类别数量。

每一条写成「问题 + 具体做法」，比如「标注不一致 → 制定统一的标注规范并对标注人员培训」。

### 6.4 三级视频里的清洗规范和标注规范（四级处理规范也可借用）☆

清洗规范 = 把代码里的注释翻译成一句话：

| 代码注释 | 写在答题卷上 |
|---|---|
| `# 加载数据集` | 数据加载：用 pandas 读取，检查结构和类型 |
| `# 检查/处理缺失值` | 缺失值：统计各列缺失，删除缺失行 |
| `# 类型转换/处理异常列` | 异常值：转成数值类型，无法转换的置为空值 |
| `# 去重` | 数据去重：删除重复行，记录删除的行数 |
| `# 标准化` | 数据标准化：用 StandardScaler 消除量纲 |
| `# 保存到 CSV` | 保存清洗后的数据：写入新的 CSV 文件 |

标注规范，5 条背一次：① 数据来源（数据集名称、获取日期、提供者）② 数据描述（每列含义、类型、取值范围）③ 标签定义（目标变量及类别含义）④ 标注准确性（抽检比例、置信度阈值）⑤ 标注一致性（多人交叉验证、争议解决）。视频说每题从中选 2~3 条就够。

### 6.5 四级 2.2：审核报告和数据分配 ★

四级 2.2 给你一个 Excel（15 条左右的标注结果）：

1. 审核报告写两块：**完整性**（有没有空着没标的，缺了几条）和**准确性**（标的值和图片是否一致、是否在规定的取值范围内）。每块写出发现的问题，再写一句总结。
2. 纠错：改正标错的，补上漏标的，删掉多余的，另存为「已审核」文件。
3. 按 8:2 分配（性别年龄、性别肤色两题）：15 条 → 训练 12 条、测试 3 条。检查四件事：训练集数量对、测试集数量对、两者加起来是 15、**两边没有重复**。
4. 另外三个变体（面部表情、产品评论、企业沟通）不分 8:2，而是要**另存「已审核」文件，再筛选出 train 文件**（并写一句筛选结论）。

### 6.6 四级 3.x：写分析和建议 ★

建议写 2~3 条就能拿分，每条「发现 + 做法」：

- 备货建议（超市题）：品类（重点备哪几个小类）、资金（预算向前几名倾斜）、备货时间（季度前提前备）、备货量（按销售占比分配）。
- 优化模型的建议（薪资题）：增加特征（岗位、学历）、更换更复杂的模型、增加数据量、做交叉验证。
- 优惠券有效期、个性化学习推荐：先说数据里看到的规律（最常见间隔、前三个年龄段），再对应给出调整做法，写出理由。

### 6.7 三级 3.1 的 Excel 分析套路（供参考）☆

视频里的三维度模板：**用户行为 / 使用频率或关注度 / 性能或响应**。第二问选 3 个优化方向，从这 5 类里挑：硬件升级、算法或软件优化、个性化定制、用户界面增强、功能拓展集成。核心：第一问发现什么瓶颈，第二问就对症下药。

### 6.8 三级 2.2 的测试报告（供参考）☆

骨架固定三段：① 模型性能（抄输出的指标）② 错误分析 ③ 改进建议。

错误分析只要会 4 个概念：

| 概念 | 看哪里 |
|---|---|
| 过拟合 | 训练得分远高于测试得分 |
| 欠拟合 | 训练和测试都低（R² 接近 0） |
| 特征不足 | 特征少、解释力弱 |
| 数据质量或类别不平衡 | 异常值、缺失、样本少、正负比例悬殊 |

改进建议 4 板斧，选 3 条：特征工程（新特征、特征选择、独热编码）、换模型（线性 → 树 → 随机森林 → XGBoost）、调参（GridSearchCV、K 折交叉验证）、数据（SMOTE、扩充样本、清洗异常值）。

---

## 阶段 7：三级加餐 ☆（四级不考）

### 图像识别 3 步

视频里的口诀：**加载模型 → 读图 + 预处理 → 跑 + 读结果**。

```python
import onnxruntime as ort
import numpy as np
import scipy.special
from PIL import Image

session = ort.InferenceSession('resnet.onnx')               # 1 加载模型
image = Image.open('img_test.jpg').convert('RGB')           # 2 读图
image = image.resize((224, 224))                            #   调整大小
image = np.asarray(image, dtype=np.float32) / 255.0         #   转成数组，缩放到 0~1
image = np.transpose(image, (2, 0, 1))                      #   通道放到最前面
image = np.expand_dims(image, axis=0)                       #   加一个批次维度

input_name = session.get_inputs()[0].name                   # 3 跑
output = session.run(None, {input_name: image})[0]          #   {名字: 数据} 是字典
probabilities = scipy.special.softmax(output, axis=-1)      #   换成概率
top5 = np.argsort(probabilities[0])[-5:][::-1]              #   概率最大的 5 个下标
```

这段不能在这里运行（需要 `onnxruntime` 和模型文件），只检查语法。

### 3.2 的「人机交互最优方式」

不少于 3 条就给分，常见的 11 条：用户界面设计、模型加载、图像上传与预处理、图像识别、结果展示、交互反馈、帮助与支持、性能优化、安全性考虑、多语言支持、可访问性。前 6 条把代码里的步骤翻译成人话，后面的是通用加分项。

---

## 附录 A：一页纸速查表（按四级用得上程度整理）

| 要做什么 | 代码 | 四级 |
|---|---|---|
| 读文件 | `pd.read_csv('a.csv')`　`pd.read_excel('a.xlsx')` | ★ |
| 看前几行、形状、类型、统计 | `data.head()`　`data.shape`　`len(data)`　`data.info()`　`data.describe()` | ★ |
| 数每个值出现几次 | `data['列'].value_counts()` | ★ |
| 分组汇总 | `data.groupby('列')['列'].sum()`　`.mean()`　`.agg(['count','mean'])` | ★ |
| 排序、取前 N | `sort_values('列', ascending=False).head(N)`　`nlargest(N, '列')` | ★ |
| 条件筛选 | `data[data['列'] > 7]`　`isin([...])`　`between(a, b)`　多个条件用 `&`（且）或竖线（或）连接，每个条件加括号 | ★ |
| 检查空值、重复 | `data.isnull().sum()`　`data.duplicated().sum()` | ★ |
| 处理空值、重复 | `dropna(subset=['列'])`　`fillna(值)`　`drop_duplicates()` | ★ |
| 转类型 | `astype()`　`pd.to_numeric(列, errors='coerce')`　`pd.to_datetime(列, format=...)` | ★ |
| 日期运算 | `.dt.year`　`.dt.month`　`.dt.days`　两个日期相减 | ★ |
| 改列名、删列、替换值 | `rename(columns={'旧':'新'})`　`drop(columns=[...])`　`replace(2, 0)` | ★ |
| 新增列 | `np.where(条件, 值1, 值2)`　`pd.cut(...)`　`列.apply(...)`　列与列运算 | ★ |
| 画图 | `data.plot(kind='bar')`　`plt.scatter(x, y)`　`plt.show()` | ★ |
| 保存 | `to_csv('文件名', index=False)`　`pd.concat([X, y], axis=1)` | ★ |
| 分训练集和测试集 | `train_test_split(X, y, test_size=0.2, random_state=42)` | ★ |
| 线性回归 | `LinearRegression()`　`fit`　`predict`　`coef_`　`intercept_` | ★ |
| 评分 | `model.score(...)`　`r2_score`　`mean_squared_error` | ★☆ |
| 分类模型 | `LogisticRegression(max_iter=1000)`　`RandomForestRegressor(n_estimators=100)`　`xgb.XGBRegressor(n_estimators=100)` | ☆ |
| 保存模型、补充少数类 | `pickle.dump(model, file)`　`smote.fit_resample(X, y)` | ☆ |
| 标准化、分位数 | `StandardScaler().fit_transform()`　`.quantile()`　`(x - x.mean()) / x.std()` | ☆ |
| 独热编码 | `pd.get_dummies(...)` | ☆ |
| 图像识别 | `ort.InferenceSession`　`Image.open().convert()`　`np.expand_dims`　`session.run(None, ...)`　`softmax`　`argsort` | ☆ |

## 附录 B：常见报错

| 报错 | 通常是因为 |
|---|---|
| `KeyError: '某列'` | 列名写错了（多了空格、大小写不对）。先 `print(data.columns)` 看真实列名 |
| `NameError: name 'data' is not defined` | 前面那个格子没运行，或名字拼错 |
| `FileNotFoundError` | 文件名或路径不对；文件要和代码放在同一个文件夹 |
| `ValueError: could not convert string to float` | 数字列里混进了文字，先 `pd.to_numeric(列, errors='coerce')` |
| `ValueError: Expected 2D array` | `X` 写成了一层方括号，要写 `data[['列']]` |
| 画出来的图没有中文 | 加上阶段 3.8 里的两行字体设置 |

## 附录 C：练习对照（`code-quiz/index.html`）

| 阶段 | 题目 |
|---|---|
| 3 | 四级 3.1.1（超市）；三级 1.1.1（患者）、2.1.1（汽车清洗）、3.1.1（音箱） |
| 4 | 四级 3.2.5（薪资）；三级 2.2.1（Logistic） |
| 5 | 四级 2.1.1（转 jpg 重命名）、2.1.3（XML 转 CSV） |
| 7 | 三级 3.2.1（图像识别） |
