import whiteSchool from "../assets/master/bighead-school/bighead-school-white.png";
import blackSchool from "../assets/master/bighead-school/bighead-school-black.png";

type Props = {
  openedBy: "white" | "black";
};

export default function BigHeadSchoolOverlay({
  openedBy
}: Props){

const image =
openedBy==="white"
? whiteSchool
: blackSchool;

return(

<div className="bighead-overlay">

<img
className="bighead-image"
src={image}
alt="The Big Head School"
/>

<div className="school-title">

THE BIG HEAD SCHOOL™

</div>

</div>

)

}