// Adapted from frontend/src/components/common/FollowButton.jsx: signed out, it
// leads to sign-in; signed in, it follows or unfollows. The first follow also
// offers to turn notifications on (`primer`, from useFollow).
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFollow } from '../../hooks/useFollow.js';
import Button from './Button.jsx';

export default function FollowButton({ targetType, targetId }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated, following, toggle, isPending, primer } = useFollow(targetType, targetId);

  if (!isAuthenticated) {
    return (
      <Button variant="secondary" onPress={() => router.push('/auth/login')}>
        {t('follow.follow')}
      </Button>
    );
  }
  return (
    <>
      <Button
        variant={following ? 'secondary' : 'primary'}
        onPress={toggle}
        loading={isPending}
        accessibilityLabel={t(following ? 'follow.following' : 'follow.follow')}
      >
        {t(following ? 'follow.following' : 'follow.follow')}
      </Button>
      {primer}
    </>
  );
}
