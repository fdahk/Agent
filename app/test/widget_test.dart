import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:agent_workspace/main.dart';

/**
 * Flutter 官方测试体系里的 flutter_test，是 Flutter 标准测试工具的一部分，主要支持：
 * 单元测试 Widget 测试 一些带渲染树交互的组件测试
 * 关于端到端测试，也有官方方案，但分两代：
 * 现在推荐：integration_test
 * Flutter 官方维护
 * 用来做端到端测试 / 真机或模拟器集成测试
 * 一般需要在 pubspec.yaml 里加 dev_dependencies
 * 旧方案：flutter_driver
 * 以前官方提供
 * 现在基本已被 integration_test 取代，不建议新项目再用
 * flutter_test：偏本地、快速、组件级测试
 * integration_test：偏真实运行环境、端到端流程测试
 */
void main() {
  testWidgets('Counter increments smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const MyApp());

    // Verify that our counter starts at 0.
    expect(find.text('0'), findsOneWidget);
    expect(find.text('1'), findsNothing);

    // Tap the '+' icon and trigger a frame.
    await tester.tap(find.byIcon(Icons.add));
    await tester.pump();

    // Verify that our counter has incremented.
    expect(find.text('0'), findsNothing);
    expect(find.text('1'), findsOneWidget);
  });
}
