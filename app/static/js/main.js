const parallax = document.getElementById("parallax-1");
const shadow = document.querySelector(".shadow-to-top");
const opacity = document.querySelectorAll(".opacity");
const translate = document.querySelectorAll(".translate");
let elementsArray = document.querySelectorAll(".content-p");

window.addEventListener("scroll", function()
{
  let offset = window.pageYOffset;
  parallax.style.backgroundPositionY = offset * 0.7 + "px";
  shadow.style.height = offset * 0.5 + 300 + "px";

  translate.forEach(element => {
              let speed = element.dataset.speed;
              element.style.transform = `translateY(${speed * scroll}px)`;
          })

  opacity.forEach(element => {
            element.style.opacity = scroll / (sectionY.top + section_height);
            }
  )

})

$(window).on("load",function() {
  $(window).scroll(function() {
    var windowBottom = $(this).scrollTop() + $(this).innerHeight();
    $(".fade").each(function() {
      /* Check the location of each desired element */
      var objectBottom = $(this).offset().top + $(this).outerHeight() + 50;

      /* If the element is completely within bounds of the window, fade it in */
      if (objectBottom < windowBottom) { //object comes into view (scrolling down)
        if ($(this).css("opacity")==0) {$(this).fadeTo(500,1);}
      } else { //object goes out of view (scrolling up)
        if ($(this).css("opacity")==1) {$(this).fadeTo(500,0);}
      }
    });
  }).scroll(); //invoke scroll-handler on page-load
});
