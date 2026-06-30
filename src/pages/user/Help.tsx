import { Body1, Button, Subtitle2, makeStyles, tokens } from '@fluentui/react-components';
import { AddCircleRegular } from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { Surface } from '../../components/Surface';
import { DetailList } from '../../components/DetailList';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  cardTitle: { marginBottom: tokens.spacingVerticalM },
  body: { color: tokens.colorNeutralForeground2 },
  actions: { marginTop: tokens.spacingVerticalM },
});

export function Help() {
  const styles = useStyles();
  const navigate = useNavigate();

  return (
    <div className={styles.root}>
      <PageHeader
        title="Help"
        subtitle="Everything you need to apply for a loan and track your application."
      />

      <Surface>
        <Subtitle2 as="h2" className={styles.cardTitle}>
          Getting started
        </Subtitle2>
        <Body1 className={styles.body}>
          Use <strong>Apply for a Loan</strong> to start a new application — it's a short, guided
          process and your progress is saved automatically. Once submitted, track every application
          and its status on the <strong>My Applications</strong> page.
        </Body1>
        <div className={styles.actions}>
          <Button appearance="primary" icon={<AddCircleRegular />} onClick={() => navigate('/user/apply-loan')}>
            Apply for a Loan
          </Button>
        </div>
      </Surface>

      <Surface>
        <Subtitle2 as="h2" className={styles.cardTitle}>
          What your status means
        </Subtitle2>
        <DetailList
          items={[
            { label: 'Received', value: "We've received your application." },
            { label: 'Under Review', value: 'Our loan officers are reviewing your details.' },
            { label: 'Approved', value: 'Your loan has been approved.' },
            { label: 'Rejected', value: 'Declined — review the remarks, then reapply.' },
            { label: 'ReSubmitted', value: 'Your updated application is being reviewed.' },
          ]}
        />
      </Surface>

      <Surface>
        <Subtitle2 as="h2" className={styles.cardTitle}>
          Frequently asked questions
        </Subtitle2>
        <DetailList
          items={[
            { label: 'How do I apply?', value: 'Open “Apply for a Loan” and follow the steps.' },
            { label: 'Where do I see status?', value: 'On the “My Applications” page.' },
            { label: 'My loan was rejected — what now?', value: 'Open it and choose “Reapply”.' },
            { label: 'Is my progress saved?', value: 'Yes — drafts are saved automatically.' },
          ]}
        />
      </Surface>
    </div>
  );
}

export default Help;
