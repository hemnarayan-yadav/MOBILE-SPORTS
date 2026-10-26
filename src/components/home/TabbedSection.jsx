import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { TabStrip } from '../common/Layout.jsx';
import { SPACING } from '../../theme/tokens.js';

/**
 * A home section whose tabs come and go with the data.
 *
 * The owner's rule: a tab with nothing in it is not shown, and a section whose
 * tabs are all empty is not shown either. Written once here rather than in
 * every section that needs it — and because the server already decides what is
 * empty, this only has to read what it was given.
 *
 * `tabs` is `[{ id, label, items }]` in the order they should appear. A single
 * surviving tab needs no tab strip: one tab is not a choice.
 */
export default function TabbedSection({ tabs, renderItem, keyExtractor = (item) => item.id }) {
  const filled = useMemo(() => tabs.filter((tab) => tab.items?.length), [tabs]);
  const [chosen, setChosen] = useState(null);

  if (filled.length === 0) return null;

  // The reader's tab if it still has anything, otherwise the first that does —
  // so a tab emptying underneath them moves them somewhere useful instead of
  // showing a blank panel.
  const active = filled.find((tab) => tab.id === chosen) ?? filled[0];

  return (
    <View style={styles.wrap}>
      {filled.length > 1 ? (
        <TabStrip
          value={active.id}
          onChange={setChosen}
          tabs={filled.map(({ id, label }) => ({ id, label }))}
        />
      ) : null}
      <View style={styles.stack}>
        {active.items.map((item, index) => (
          <View key={keyExtractor(item)}>{renderItem(item, index)}</View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.sm },
  stack: { gap: SPACING.md },
});
