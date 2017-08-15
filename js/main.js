/**
 * load navigation
 */
$(function(){
    $("#navigation").append("<header>\n" +
        "    <div id=\"logo\">EXTRUSO</div>\n" +
        "    <nav class=\"site-navigation\">\n" +
        "        <ul class=\"menu-list\">\n" +
        "            <li><a href=\"/xtruso_web\">Home</a></li>\n" +
        "            <li><a href=\"/xtruso_web/news\">Aktuelles</a></li>\n" +
        "            <li><a href=\"/xtruso_web/map\">Karte</a></li>\n" +
        "            <li><a href=\"/xtruso_web/projektinfo\">Projektinformationen</a></li>\n" +
        "        </ul>\n" +
        "    </nav>\n" +
        "</header>");
});

/**
 * load footer
 */
$(function(){
    $("#footer").append("<footer>\n" +
        "   <div class=\"content white\" style=\"line-height: 4em;text-align: center;\">\n" +
        "       &copy; EXTRUSO Projekt\n" +
        "   </div>\n" +
        "</footer>");
});

/**
 * load funding info
 */
$(function(){
    $("#funding").append("<div class=\"content container\">\n" +
        "    <div class=\"flex-container\">\n" +
        "       <div class=\"flex-item-fun\"><img src=\"/xtruso_web/img/logo-extruso.png\" style=\"height: 100px;\"></div>\n" +
        "       <div class=\"flex-item-fun\"><img src=\"/xtruso_web/img/logo-tud.png\" style=\"height: 100px;\"></div>\n" +
        "       <div class=\"flex-item-fun\"><img src=\"/xtruso_web/img/logo-esf.png\" style=\"height: 100px;\"></div>\n" +
        "    </div>\n" +
        "</div>");
});

/**
 * expand/collapse article content
 */
$(function(){
    $(".article_title").click(function () {
        var $title = $(this);
        var $content = $title.next();
        $content.slideToggle(500);
        $title.toggleClass("collapsed");
        $title.toggleClass("expanded");
    });
});
