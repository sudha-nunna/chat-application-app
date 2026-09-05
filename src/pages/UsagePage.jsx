import CreditsModal from "../components/subscription/CreditsModal";

const UsagePage = () => {
  return (
    <div className="flex flex-1 h-full w-full overflow-hidden relative bg-transparent text-text-primary">
      <CreditsModal isPage={true} />
    </div>
  );
};

export default UsagePage;
