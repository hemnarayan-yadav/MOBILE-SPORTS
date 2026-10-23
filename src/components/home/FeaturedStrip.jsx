import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AppText from '../common/AppText.jsx';
import Avatar from '../common/Avatar.jsx';
import { SPACING } from '../../theme/tokens.js';

// The people at the top of the home screen, so somebody opening KhelScore for
// the first time recognises a name.
//
// An entry either points at a player here or stands on its own — a coach, an
// organiser, a retired star who was never entered into a squad. **Only a
// linked one is pressable**: a standalone card has no profile behind it, and a
// card that looks tappable and then does nothing is worse than one that never
// invited the tap.
const CARD_WIDTH = 96;

function FeaturedCard({ person }) {
  const router = useRouter();
  const openable = Boolean(person.playerId);

  const body = (
    <View style={styles.card}>
      <Avatar src={person.photoUrl} name={person.name} size="xl" />
      <AppText variant="small" weight="semibold" numberOfLines={1} style={styles.center}>
        {person.name}
      </AppText>
      {person.title ? (
        <AppText variant="small" tone="muted" numberOfLines={1} style={styles.center}>
          {person.title}
        </AppText>
      ) : null}
    </View>
  );

  if (!openable) {
    // Not a button, not pressable, and not announced as one.
    return <View accessibilityRole="image" accessibilityLabel={person.name}>{body}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={person.name}
      onPress={() => router.push(`/player/${person.playerId}`)}
      style={({ pressed }) => (pressed ? styles.pressed : null)}
    >
      {body}
    </Pressable>
  );
}

export default function FeaturedStrip({ people }) {
  if (!people?.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {people.map((person) => (
        <FeaturedCard key={person.id} person={person} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: SPACING.lg, paddingVertical: SPACING.xs, paddingRight: SPACING.lg },
  card: { width: CARD_WIDTH, alignItems: 'center', gap: SPACING.xs },
  center: { textAlign: 'center' },
  pressed: { opacity: 0.85 },
});
