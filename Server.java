import com.fastcgi.FCGIInterface;
import java.nio.charset.StandardCharsets;
import java.net.URLDecoder;
import java.util.HashMap;
import java.util.Map;
import java.time.Instant;
import java.math.BigDecimal;

public class Server{
    public static void main(String[] args){
        FCGIInterface fcgiInterface =  new FCGIInterface();
        while (fcgiInterface.FCGIaccept() >=0){
            long startTime = System.nanoTime();

            try{
                String method = System.getProperty("REQUEST_METHOD");
                if (!"GET".equals(method)){
                    errorIdentification(405, "должен быть метод GET");
                    continue;
                }
                String queryString = System.getProperty("QUERY_STRING");
                if (queryString == null){
                    errorIdentification(400, "не переданы параметры");
                    continue;
                }
                Map<String, String> parameters  = new HashMap<>();
                for (String pair: queryString.split("&")){
                    String[] parts = pair.split("=",2);
                    if (parts.length!=2){
                        throw new IllegalArgumentException("Неверный параметр");
                    }
                    String name = URLDecoder.decode(parts[0], StandardCharsets.UTF_8);
                    String value = URLDecoder.decode(parts[1], StandardCharsets.UTF_8);
                    parameters.put(name, value);
                }
                if (!parameters.containsKey("x") ||
                    !parameters.containsKey("y") ||
                    !parameters.containsKey("r")) {
                    errorIdentification(400, "не хватает параметров");
                    continue;
                }
                
                double x = Double.parseDouble(parameters.get("x"));
                String ytext = parameters.get("y");
                double r = Double.parseDouble(parameters.get("r"));
                if (!ytext.matches("[+-]?\\d+(\\.\\d+)?")){
                    errorIdentification(400, "Y должен быть числом");
                    continue;
                }
                BigDecimal y = new BigDecimal(ytext);

                boolean invalidX = !isAllowed(parameters.get("x"), "-5", "-4", "-3", "-2", "-1", "0", "1", "2", "3");
                boolean invalidY = y.compareTo(new BigDecimal("-3")) <=0 || y.compareTo(new BigDecimal("5")) >=0;
                boolean invalidR = !isAllowed(parameters.get("r"),"1", "1.5", "2", "2.5", "3");
                if (invalidR || invalidX || invalidY){
                    errorIdentification(400, "Недопустимые X, Y или R"); 
                    continue;
                }
                boolean isHit = checkHit(x,y,r);
                double timeScript = (System.nanoTime()-startTime)/1000000.0;    //мс
                String currentTime = Instant.now().toString();
                String jsonResponse =
                        "{\"xVal\":" + x +
                        ",\"yVal\":\"" + y.toPlainString() + "\""+
                        ",\"rVal\":" + r +
                        ",\"hit\":" + isHit +
                        ",\"timestamp\":\"" + currentTime + "\"" +
                        ",\"timeScript\":" + timeScript +
                        "}";
                String response = "Content-Type: application/json; charset=UTF-8\r\n"+
                    "\r\n" + jsonResponse;
                byte[] responseBytes = response.getBytes(StandardCharsets.UTF_8);
                System.out.write(responseBytes, 0, responseBytes.length);
                System.out.flush();
            } catch (IllegalArgumentException e){
                errorIdentification(400, "Некорректный формат параметров запроса");
            }
        }
    }
    private static boolean isAllowed(String value, String... allowedValues){
        BigDecimal num = new BigDecimal(value);
        for (String allowed: allowedValues){
            if (num.compareTo(new BigDecimal(allowed))==0){
                return true;
            }
        }
        return false;
    }
    private static boolean checkHit(double x, BigDecimal y, double r) {
        BigDecimal bx = BigDecimal.valueOf(x);
        BigDecimal br = BigDecimal.valueOf(r);
        BigDecimal zero = BigDecimal.ZERO;
        BigDecimal two = BigDecimal.valueOf(2);
        boolean rectangle =
            x >= -r && x <= 0 &&
            y.compareTo(zero) >= 0 &&
            y.compareTo(br.divide(two)) <= 0;
        boolean circle =
            x <= 0 &&
            y.compareTo(zero) <= 0 &&
            bx.multiply(bx).add(y.multiply(y)).compareTo(br.multiply(br)) <= 0;
        boolean triangle =
            x >= 0 && x <= r / 2 &&
            y.compareTo(zero) <= 0 &&
            y.compareTo(bx.multiply(two).subtract(br)) >= 0;
        return rectangle || circle || triangle;
    }

    private static void errorIdentification(int status, String message){
        String reason;
        switch (status){
            case 400:
                reason = "Bad Request";
                break;
            case 405:
                reason = "Method Not Allowed";
                break;
            case 500:
                reason = "Internal Server Error";
                break;
            default:
                throw new IllegalArgumentException("Неизвестная ошибка: " + status); 
        }
        String response = "Status: " + status +" "+ reason + "\r\n";
        if (status==405){
            response += "Allow: GET\r\n";
        }
        response += "Content-Type: application/json; charset=UTF-8\r\n"+
                    "{\"error\":\"" + message + "\"}";
        byte[] responseBytes = response.getBytes(StandardCharsets.UTF_8);
        System.out.write(responseBytes, 0 , responseBytes.length);
        System.out.flush();
    }
}