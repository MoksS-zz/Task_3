const switchTheme = () => {
  document.querySelector(".onoffswitch").classList.toggle("onoffswitch_checked");

  const defaultTheme = document.querySelectorAll(".theme_color_project-default");
  const inverseTheme = document.querySelectorAll(".theme_color_project-inverse")

  for (elem of defaultTheme) {
    elem.classList.remove("theme_color_project-default");
    elem.classList.add("theme_color_project-inverse");
  }
  for (elem of inverseTheme) {
    elem.classList.remove("theme_color_project-inverse");
    elem.classList.add("theme_color_project-default");
  }
};

const history = elem => {
  elem.querySelector(".e-accordion__more").classList.toggle("history__hide");
};

function click(e) {
  let elem = e.target

  if (elem.classList.contains("onoffswitch__button") || elem.classList.contains("onoffswitch")) {
    switchTheme();
    return;
  }
  
  while(elem) {
    if(elem.classList.contains("history__transaction")) {
      history(elem);
      return; 
    }
    elem = elem.parentElement;
  }
};

window.onload = function () {
  document.body.addEventListener("click", click);
};