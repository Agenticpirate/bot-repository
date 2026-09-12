---

name: java-code-review  
description: >  
  对 Java 项目进行代码安全评审。触发场景：用户想评审 Java 代码改动、检查 PR/MR 安全问题、review java 代码、分析 MyBatis/MyBatis-Plus SQL 改动、检查 NPE/异常/线程安全/资源泄漏风险。工作流：基于 git diff（当前分支 vs master）获取改动代码，结合上下文分析安全隐患，并列出所有 MyBatis SQL 改动及其原始 SQL。只要用户提到"review java"、"评审 java 代码"、"检查 java 改动"、"mybatis sql 分析"、"spring 代码审查"等，必须触发本 skill。

---

# Java Code Review Skill

## 概述

本 skill 用于对 Java 项目做安全评审，聚焦以下三类问题：

1. **安全风险**：NullPointerException、未捕获异常、数组/集合越界、类型转换异常、线程安全、资源泄漏
2. **MyBatis/MyBatis-Plus SQL 改动**：提取所有使用 MyBatis 框架的 SQL 操作，还原原始 SQL 语句

---

## 执行步骤

### Step 1：分支来源检查

在做代码评审之前，先验证当前分支的来源是否符合规范。

```bash
# 获取当前分支名
git branch --show-current

# 检查当前分支是否从 master 切出（找到与 master 的分叉点）
git merge-base HEAD master

# 查看从分叉点到现在的所有 merge commit，检查是否有 develop 分支合入
git log $(git merge-base HEAD master)..HEAD --merges --oneline

# 查看完整提交历史（含合并），找出所有合入的分支名
git log $(git merge-base HEAD master)..HEAD --oneline --graph
```

**判断逻辑：**

1. **验证是否从 master 切出**

```bash
# 找分叉点
FORK_POINT=$(git merge-base HEAD master)
# 检查分叉点是否在 master 的提交历史中
git branch --contains $FORK_POINT | grep -E '^\*?\s*master$'
```

   - ✅ 分叉点存在于 master 历史 → 分支来源正常
   - ❌ 分叉点不在 master 历史 → 说明不是从 master 切出，输出警告

2. **检查是否有 develop 分支代码合入**

```bash
# 查找 merge commit 中来自 develop 的记录
git log $(git merge-base HEAD master)..HEAD --merges --oneline | grep -i develop

# 或通过引用日志确认
git log $(git merge-base HEAD master)..HEAD --oneline --graph | grep -i develop
```

   - ✅ 无 develop 相关 merge commit → 分支干净
   - ❌ 发现 develop 分支合入记录 → 输出高危警告，列出具体 merge commit

**输出格式（在最终报告最前面展示）：**

```plain
【分支来源检查】
当前分支: feature/xxx
分叉自:   master (commit: a1b2c3d)

✅ 来源正常：当前分支从 master 切出
❌ 警告：检测到 develop 分支代码合入！
   Merge commit: f3e2d1c  Merge branch 'develop' into feature/xxx
   合入时间: 2024-01-15 14:32
   风险说明: develop 分支可能包含未经测试或未上线的功能，混入当前分支可能导致意外代码上线
```

> 如果 develop 分支有代码合入，应在评审报告顶部用 🔴 标注，提醒评审人重点关注。

### Step 2：获取 Git Diff

```bash
# 获取当前分支与 master 的完整 diff（含上下文行）
git diff master...HEAD -- '*.java' '*.xml'

# 如果 master 不存在，尝试 main
git diff main...HEAD -- '*.java' '*.xml'

# 获取变更的文件列表
git diff --name-only master...HEAD -- '*.java' '*.xml'
```

> 注意：Java 项目的 SQL 不仅在 `.java` 文件中，MyBatis 的 XML Mapper 文件（`*.xml`）也是 SQL 的重要来源，需要一并获取。

如果仓库没有 master/main，改用：

```bash
git log --oneline -1  # 确认 HEAD
git diff HEAD~1 HEAD -- '*.java' '*.xml'
```

### Step 3：获取上下文代码

对于 diff 中涉及的每个文件，获取完整文件内容以理解上下文：

```bash
# 获取变更文件的完整内容（当前版本）
git show HEAD:<filepath>

# 或直接读取工作区文件
cat <filepath>
```

**重点关注：**

+ diff 所在方法的完整实现
+ 被修改代码调用的方法签名与返回类型
+ 实体类/DTO 定义（判断字段是否可能为 null）
+ 异常处理链路（try-catch-finally 是否完整）
+ Spring Bean 注入方式和生命周期
+ MyBatis Mapper 接口与对应 XML 映射文件

**读取文件时使用带行号的命令，为后续行号定位做准备：**

```bash
# 带行号读取，方便后续 grep 验证
cat -n <filepath>

# 查看关键注解和 SQL 相关代码
grep -n "@Select\|@Insert\|@Update\|@Delete\|@Transactional\|@Param\|QueryWrapper\|LambdaQueryWrapper" <filepath>
```

### Step 4：安全问题分析

逐一检查以下风险类别：

#### 4.1 NullPointerException 风险

| 场景 | 检查点 |
| --- | --- |
| 方法返回值为 null | 调用方法后是否判空再使用（特别是 `findById`、`getOne`、`selectOne` 等查询方法） |
| 集合操作 | `list.get(0)`、`list.stream()` 前是否判断 `list != null && !list.isEmpty()` |
| Map 取值 | `map.get(key)` 返回可能为 null，链式调用前是否判空 |
| 自动拆箱 | `Integer`/`Long`/`Boolean` 等包装类型拆箱为基本类型时，值为 null 会 NPE |
| Optional 误用 | `Optional.get()` 前是否调用 `isPresent()` 或使用 `orElse`/`orElseThrow` |
| 链式调用 | `a.getB().getC().getName()` 中间任一环节为 null 即 NPE |
| Spring 注入 | `@Autowired` 字段在非 Spring 管理的对象中为 null |

#### 4.2 未捕获/未处理异常

| 场景 | 检查点 |
| --- | --- |
| Checked Exception | 方法签名中 throws 的异常是否被调用方正确处理 |
| Runtime Exception | 数据库操作、JSON 解析、远程调用等是否有 try-catch |
| 空 catch 块 | `catch (Exception e) {}` 吞掉异常不处理不记录 |
| catch 范围过大 | `catch (Exception e)` 覆盖了不该被忽略的异常类型 |
| @Transactional 回滚 | 默认只回滚 RuntimeException，checked exception 不回滚，需要 `rollbackFor = Exception.class` |
| CompletableFuture | 异步任务中的异常是否被 `exceptionally`/`handle` 处理 |

#### 4.3 数组/集合越界

| 场景 | 检查点 |
| --- | --- |
| 数组下标访问 | `arr[i]` 前是否判断 `i >= 0 && i < arr.length` |
| List.get(index) | 是否判断 `index < list.size()` |
| subList 操作 | `list.subList(from, to)` 中 to 是否可能超出 size |
| 空集合取首元素 | `list.get(0)` 或 `list.iterator().next()` 前是否判空 |
| Stream 操作 | `findFirst().get()` 未处理空 Optional |
| 字符串截取 | `str.substring(a, b)` 中 b 是否可能越界 |

#### 4.4 类型转换风险

| 场景 | 检查点 |
| --- | --- |
| 强制类型转换 | `(TargetType) obj` 前是否使用 `instanceof` 检查 |
| 泛型擦除 | 运行时类型不匹配导致 ClassCastException |
| JSON 反序列化 | `JSON.parseObject` / `ObjectMapper.readValue` 类型不匹配 |
| 数值类型转换 | `Long` 强转 `Integer` 可能溢出，`BigDecimal` 与 `double` 精度丢失 |

#### 4.5 线程安全问题

| 场景 | 检查点 |
| --- | --- |
| 共享可变状态 | 成员变量在多线程环境下是否有同步保护 |
| SimpleDateFormat | 非线程安全，是否作为成员变量共享（应使用 `DateTimeFormatter`） |
| HashMap 并发写 | 多线程写 HashMap 导致死循环或数据丢失，应使用 ConcurrentHashMap |
| 双重检查锁定 | 单例模式中变量是否声明为 `volatile` |
| Spring Bean 默认单例 | Controller/Service 中的成员变量在并发请求下共享 |
| 线程池参数 | 核心线程数、队列容量、拒绝策略是否合理 |

#### 4.6 资源泄漏

| 场景 | 检查点 |
| --- | --- |
| IO 流未关闭 | InputStream/OutputStream/Reader/Writer 是否使用 try-with-resources |
| 数据库连接 | 手动获取的 Connection/Statement/ResultSet 是否关闭 |
| HTTP 连接 | HttpClient/OkHttp 的 Response/ResponseBody 是否关闭 |
| 线程池未关闭 | ExecutorService 在应用关闭时是否调用 shutdown |
| Redis 连接 | Jedis/Lettuce 连接是否归还连接池 |

#### 4.7 其他常见问题

+ **SQL 注入**：MyBatis 中使用 `${}` 拼接用户输入（应使用 `#{}`）
+ **Spring 事务失效**：同类内部方法调用 `@Transactional` 方法不会走代理
+ **序列化安全**：敏感字段（密码、token）是否标记 `@JsonIgnore` 或 `transient`
+ **日志信息泄漏**：日志中是否打印了敏感信息（密码、身份证号、手机号）
+ **硬编码**：密码、密钥、API Key 是否硬编码在代码中
+ **equals/hashCode**：重写 `equals` 是否同时重写 `hashCode`

### Step 5：提取 MyBatis/MyBatis-Plus SQL 改动

识别所有 MyBatis 操作并还原原始 SQL。

#### 5.1 识别 MyBatis 操作模式

**注解方式（Mapper 接口）：**

```java
// 查询类
@Select("SELECT * FROM user WHERE id = #{id}")
User selectById(@Param("id") Long id);

@Select("<script>SELECT * FROM user WHERE status = #{status} "
    + "<if test='name != null'>AND name LIKE CONCAT('%', #{name}, '%')</if>"
    + "</script>")
List<User> selectByCondition(@Param("status") Integer status, @Param("name") String name);

// 写入类
@Insert("INSERT INTO user(name, age) VALUES(#{name}, #{age})")
int insert(User user);

// 更新类
@Update("UPDATE user SET name = #{name} WHERE id = #{id}")
int updateById(User user);

// 删除类
@Delete("DELETE FROM user WHERE id = #{id}")
int deleteById(@Param("id") Long id);
```

**XML Mapper 方式：**

```xml
<!-- 查询 -->
<select id="selectByCondition" resultType="User">
    SELECT * FROM user
    <where>
        <if test="name != null">AND name = #{name}</if>
        <if test="age != null">AND age > #{age}</if>
    </where>
    ORDER BY id DESC
    LIMIT #{offset}, #{limit}
</select>

<!-- 写入 -->
<insert id="batchInsert" parameterType="list">
    INSERT INTO user(name, age) VALUES
    <foreach collection="list" item="item" separator=",">
        (#{item.name}, #{item.age})
    </foreach>
</insert>

<!-- 更新 -->
<update id="updateSelective">
    UPDATE user
    <set>
        <if test="name != null">name = #{name},</if>
        <if test="age != null">age = #{age},</if>
    </set>
    WHERE id = #{id}
</update>

<!-- 删除 -->
<delete id="deleteByIds">
    DELETE FROM user WHERE id IN
    <foreach collection="ids" item="id" open="(" close=")" separator=",">
        #{id}
    </foreach>
</delete>
```

**MyBatis-Plus 方式（Java 代码）：**

```java
// 查询类
QueryWrapper<User> wrapper = new QueryWrapper<>();
wrapper.eq("status", 1).like("name", keyword).orderByDesc("created_at");
userMapper.selectList(wrapper);

LambdaQueryWrapper<User> lambdaWrapper = new LambdaQueryWrapper<>();
lambdaWrapper.eq(User::getStatus, 1).last("LIMIT 10");
userMapper.selectOne(lambdaWrapper);

// 写入类
userMapper.insert(user);
saveBatch(userList);

// 更新类
UpdateWrapper<User> updateWrapper = new UpdateWrapper<>();
updateWrapper.eq("id", id).set("status", 2);
userMapper.update(null, updateWrapper);

LambdaUpdateWrapper<User> lambdaUpdate = new LambdaUpdateWrapper<>();
lambdaUpdate.eq(User::getId, id).set(User::getStatus, 2);
userMapper.update(null, lambdaUpdate);

// 删除类
userMapper.deleteById(id);
userMapper.deleteBatchIds(idList);
```

#### 5.2 SQL 还原规则

| MyBatis/MyBatis-Plus 代码 | 对应 SQL |
| --- | --- |
| `#{param}` | 预编译占位符 `?`（安全） |
| `${param}` | 直接字符串拼接（有 SQL 注入风险！） |
| `<if test="name != null">` | 条件成立时拼接该 SQL 片段 |
| `<where>` | 自动添加 WHERE 并去除多余 AND/OR |
| `<set>` | 自动添加 SET 并去除末尾逗号 |
| `<foreach collection="list">` | 展开为 `(?, ?, ?)` 形式 |
| `<choose><when><otherwise>` | 类似 switch-case 选择 SQL 片段 |
| `<trim>` | 自定义前缀后缀和去除规则 |
| `wrapper.eq("col", val)` | `WHERE col = val` |
| `wrapper.ne("col", val)` | `WHERE col <> val` |
| `wrapper.like("col", val)` | `WHERE col LIKE '%val%'` |
| `wrapper.likeRight("col", val)` | `WHERE col LIKE 'val%'` |
| `wrapper.in("col", list)` | `WHERE col IN (v1, v2, ...)` |
| `wrapper.between("col", v1, v2)` | `WHERE col BETWEEN v1 AND v2` |
| `wrapper.isNull("col")` | `WHERE col IS NULL` |
| `wrapper.orderByDesc("col")` | `ORDER BY col DESC` |
| `wrapper.last("LIMIT 10")` | 在末尾追加 `LIMIT 10` |
| `wrapper.select("id", "name")` | `SELECT id, name` |
| `wrapper.groupBy("col")` | `GROUP BY col` |
| `wrapper.having("count > {0}", 5)` | `HAVING count > 5` |
| `updateWrapper.set("col", val)` | `SET col = val` |
| `updateWrapper.setSql("col = col + 1")` | `SET col = col + 1` |

**还原步骤：**

1. 确定操作表名（`@TableName` 注解、XML 中的表名、或实体类名转 snake_case）
2. 拼接 SELECT 子句（select 指定字段或 `*`）
3. 拼接 JOIN 子句（如有关联查询）
4. 拼接 WHERE 条件，区分 `#{}` (安全) 和 `${}` (风险)，标注动态条件
5. 拼接 ORDER BY / LIMIT / GROUP BY
6. 对写操作，列出所有被修改的字段
7. 对动态 SQL（`<if>`、`<choose>` 等），列出所有可能的 SQL 变体

---

## 行号确认（重要）

`git diff` 输出的 `@@` 行号是 diff 上下文行号，**不能直接用于报告**，必须通过当前分支的实际文件确认真实行号。

对每一处需要标注行号的问题代码，执行以下步骤：

```bash
# 用问题代码的关键字在当前文件中定位真实行号
grep -n "关键代码片段" <filepath>

# 如果关键字不唯一，结合方法名缩小范围
grep -n "public.*methodName\|private.*methodName" <filepath>

# MyBatis-Plus 链式调用，用关键方法定位
grep -n "QueryWrapper\|LambdaQueryWrapper\|UpdateWrapper\|selectList\|selectOne" <filepath>

# XML Mapper 文件定位
grep -n "<select\|<insert\|<update\|<delete" <filepath>
```

**规则：**

+ 报告中的行号必须来自 `grep -n` 的实际输出，不得使用 diff 中的 `@@` 行号
+ 对于多行链式调用（如 MyBatis-Plus Wrapper），行号指向该调用的**第一行**
+ 对于 XML Mapper，行号指向 `<select>`/`<insert>`/`<update>`/`<delete>` 标签所在行
+ 若同一代码片段出现多次，结合方法上下文取正确的那一处

---

## 输出格式

### 一、安全风险清单

按严重程度排列（🔴 高危 / 🟡 中危 / 🟢 低危）：

```plain
🔴 [高危] 文件: src/main/java/com/example/service/UserService.java, 行: 42
   问题: NullPointerException 风险 —— userMapper.selectById(id) 返回可能为 null，但直接调用 user.getName()
   改动前: （原始代码）
   改动后: （新代码）
   建议: 添加判空 if (user == null) { throw new BusinessException("用户不存在"); }

🔴 [高危] 文件: src/main/resources/mapper/OrderMapper.xml, 行: 35
   问题: SQL 注入风险 —— 使用 ${tableName} 拼接表名，用户可控输入可注入恶意 SQL
   改动后: <select id="selectByTable">SELECT * FROM ${tableName} WHERE id = #{id}</select>
   建议: 表名不能用 #{}，应在 Java 层白名单校验 tableName，或改用枚举限定

🟡 [中危] 文件: src/main/java/com/example/service/OrderService.java, 行: 88
   问题: @Transactional 事务可能不回滚 —— 方法 throws BusinessException（checked），默认不回滚
   改动后: @Transactional 
            public void createOrder(OrderDTO dto) throws BusinessException { ... }
   建议: 添加 @Transactional(rollbackFor = Exception.class)

🟡 [中危] 文件: src/main/java/com/example/controller/UserController.java, 行: 65
   问题: 自动拆箱 NPE 风险 —— Integer 类型参数直接与 int 比较，null 时抛 NPE
   改动后: if (user.getAge() > 18) { ... }  // getAge() 返回 Integer，可能为 null
   建议: 使用 Objects.nonNull 判断或改用包装类型比较

🟢 [低危] 文件: src/main/java/com/example/util/DateUtil.java, 行: 15
   问题: 线程安全 —— SimpleDateFormat 作为 static 成员变量，多线程下会数据错乱
   改动后: private static final SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
   建议: 改用 DateTimeFormatter（线程安全）或 ThreadLocal<SimpleDateFormat>
```

### 二、MyBatis SQL 改动清单

```plain
【新增】src/main/resources/mapper/OrderMapper.xml, 行: 55
XML/代码:
  <select id="selectByUserAndStatus" resultType="Order">
      SELECT * FROM t_order
      <where>
          <if test="userId != null">AND user_id = #{userId}</if>
          <if test="statusList != null and statusList.size() > 0">
              AND status IN
              <foreach collection="statusList" item="s" open="(" close=")" separator=",">
                  #{s}
              </foreach>
          </if>
      </where>
      ORDER BY created_at DESC
      LIMIT #{offset}, #{limit}
  </select>

原始 SQL（全部条件成立时）:
  SELECT * FROM t_order
  WHERE user_id = ? AND status IN (?, ?, ...)
  ORDER BY created_at DESC
  LIMIT ?, ?

动态条件说明:
  - userId 为 null 时，不拼接 user_id 条件
  - statusList 为空时，不拼接 status IN 条件

---

【修改】src/main/java/com/example/service/ProductService.java, 行: 120
代码（改动前）:
  QueryWrapper<Product> wrapper = new QueryWrapper<>();
  wrapper.eq("id", id);
  productMapper.selectOne(wrapper);

代码（改动后）:
  LambdaQueryWrapper<Product> wrapper = new LambdaQueryWrapper<>();
  wrapper.eq(Product::getId, id)
         .eq(Product::getShopId, shopId);
  productMapper.selectOne(wrapper);

原始 SQL（改动后）:
  SELECT * FROM t_product
  WHERE id = ? AND shop_id = ?

---

【新增】src/main/java/com/example/service/UserService.java, 行: 80
代码:
  LambdaUpdateWrapper<User> wrapper = new LambdaUpdateWrapper<>();
  wrapper.eq(User::getId, userId)
         .set(User::getStatus, StatusEnum.DISABLED.getCode())
         .set(User::getUpdateTime, LocalDateTime.now());
  userMapper.update(null, wrapper);

原始 SQL:
  UPDATE t_user
  SET status = ?, update_time = ?
  WHERE id = ?

---

【⚠️ 风险】src/main/resources/mapper/ReportMapper.xml, 行: 42
XML:
  <select id="selectByDynamic" resultType="Report">
      SELECT * FROM ${tableName}
      WHERE create_date BETWEEN #{startDate} AND #{endDate}
      ORDER BY ${orderColumn} ${orderDir}
  </select>

原始 SQL:
  SELECT * FROM <tableName直接拼接>
  WHERE create_date BETWEEN ? AND ?
  ORDER BY <orderColumn直接拼接> <orderDir直接拼接>

⚠️ SQL 注入风险: tableName、orderColumn、orderDir 使用 ${} 拼接，如来自用户输入必须做白名单校验
```

---

## 注意事项

+ **MyBatis `#{}` 与 `${}` 的区别**：`#{}` 是预编译参数（防注入），`${}` 是字符串替换（有注入风险）。评审时重点关注 `${}` 的使用场景，仅在表名、列名等无法用预编译的场景下允许使用，且必须做白名单校验
+ **MyBatis-Plus 的逻辑删除**：如实体配置了 `@TableLogic`，查询会自动附加 `AND deleted = 0`，删除操作实际执行 `UPDATE SET deleted = 1`，需在 SQL 还原中注明
+ **动态 SQL 分支**：对于 `<if>`/`<choose>` 等动态标签，需列出所有可能的 SQL 变体，标明哪些条件分支会被触发
+ **MyBatis-Plus Wrapper 链式调用跨多行时**，需完整拼接所有条件
+ **`@Transactional` 注意事项**：同类内部调用不走 AOP 代理导致事务失效；默认只回滚 `RuntimeException`；`readOnly = true` 仅对查询有效
+ **Spring Bean 作用域**：Controller/Service 默认单例，成员变量在并发请求间共享，存放请求级数据会导致线程安全问题
+ **Lombok 注意事项**：`@Data` 会生成 `equals`/`hashCode`，如果实体有关联集合字段可能导致递归调用栈溢出；`@Builder` 不生成无参构造函数，可能影响 MyBatis 映射
