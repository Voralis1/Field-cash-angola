import { Bike, Package, Banknote, MapPin } from "lucide-react";

export default function CourierIllustration() {
  return (
    <div className="illustration">
      <div className="ci-blob" />
      <div className="ci-main">
        <Bike strokeWidth={1.6} />
      </div>
      <div className="ci-float ci-float-1">
        <Package />
      </div>
      <div className="ci-float ci-float-2">
        <Banknote />
      </div>
      <div className="ci-float ci-float-3">
        <MapPin />
      </div>
    </div>
  );
}
