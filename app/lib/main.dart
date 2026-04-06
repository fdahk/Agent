import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  // 这个组件是整个应用的根组件。
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
      ),
      home: const MyHomePage(title: 'Flutter Demo Home Page'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  // 这个组件是应用的首页。它是有状态组件，
  // 也就是说它会关联一个 `State` 对象（定义在下方），
  // 其中包含会影响界面显示的字段。

  // 这个类是状态对象的配置容器。它保存了父组件
  // （这里是 `App` 组件）传入的值（这里是 `title`），
  // 并在 `State` 的 `build` 方法中使用。
  // Widget 子类中的字段通常都会标记为 `final`。

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  int _counter = 0;

  void _incrementCounter() {
    setState(() {
      // 调用 `setState` 是在告诉 Flutter 框架：
      // 当前这个状态发生了变化，需要重新执行下面的 `build` 方法，
      _counter++;
    });
  }

  @override
  Widget build(BuildContext context) {
    // Flutter 框架对 `build` 方法的重复执行做了性能优化，
    // 因此你通常只需要重建需要更新的部分，
    // 而不需要逐个手动修改组件实例。
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text(widget.title),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            const Text('You have pushed the button this many times:'),
            Text(
              '$_counter',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _incrementCounter,
        tooltip: 'Increment',
        child: const Icon(Icons.add),
      ), // 结尾这个逗号能让 build 方法的自动格式化结果更美观。
    );
  }
}
