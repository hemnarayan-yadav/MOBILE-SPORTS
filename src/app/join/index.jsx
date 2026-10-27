// /join — where the WhatsApp invitation's button leads, and the App Link the
// app already declares. Ported from the JoinDirect half of
// frontend/src/pages/public/JoinTeam.jsx.
//
// The link carries no token: an invitation is only ever accepted by an OTP
// proof of the invited number. Whoever arrives signs in or signs up with that
// number and every invitation waiting for it is accepted at once.
import { useTranslation } from 'react-i18next';
import Screen from '../../components/common/Screen.jsx';
import JoinActions, { useAcceptInvitations } from '../../components/team/JoinActions.jsx';
import MyJoinRequests from '../../components/team/MyJoinRequests.jsx';

export default function JoinDirect() {
  const { t } = useTranslation();
  const accept = useAcceptInvitations();
  return (
    <Screen title={t('join.directTitle')} subtitle={t('join.directIntro')}>
      {/* A captain's request is answered here, by whoever it was addressed to.
          It renders nothing when there is none, leaving the older invitation
          path below it untouched. */}
      <MyJoinRequests />
      <JoinActions accepting={accept.isPending} onConfirm={accept.mutate} />
    </Screen>
  );
}
